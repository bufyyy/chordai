import * as tf from '@tensorflow/tfjs';
import { Chord } from '@tonaljs/tonal';

class ModelService {
  constructor() {
    this.model = null;
    this.mappings = null;
    this.idToToken = null;
    this.genres = [];
    this.chords = [];
    this.isLoaded = false;
    this.isLoading = false;
    this.modelPath = '/model/web_model/model.json';
    this.mappingsPath = '/model/mappings.json';
  }

  async loadModel() {
    if (this.isLoaded) return true;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;

    try {
      console.log('[DEBUG] Starting model and mappings load...');

      const [mappingsResponse, model] = await Promise.all([
        fetch(this.mappingsPath),
        tf.loadLayersModel(this.modelPath)
      ]);

      const rawMappings = await mappingsResponse.json();
      this.mappings = rawMappings.token_to_int;
      this.model = model;

      console.log('[DEBUG] Mappings Loaded:', Object.keys(this.mappings).length, 'tokens');

      // Generate reverse mapping
      this.idToToken = {};
      Object.keys(this.mappings).forEach(token => {
        this.idToToken[this.mappings[token]] = token;
      });

      // Extract genres and chords
      const tokens = Object.keys(this.mappings);
      this.genres = tokens
        .filter(token => token.startsWith('<GENRE='))
        .map(token => token.replace('<GENRE=', '').replace('>', ''))
        .sort();

      this.chords = tokens.filter(token => !token.startsWith('<'));

      console.log('[DEBUG] Available Genres:', this.genres);
      console.log('[DEBUG] Available Chords Count:', this.chords.length);
      console.log('[DEBUG] Special Token IDs:', {
        PAD: this.mappings['<PAD>'],
        START: this.mappings['<START>'],
        END: this.mappings['<END>']
      });

      this.isLoaded = true;
      console.log('[DEBUG] Model and mappings loaded successfully!');
      return true;
    } catch (error) {
      console.error('[DEBUG] FAILED to load model or mappings:', error);
      this.isLoaded = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Predict the next chord in the sequence
   * IMPORTANT: Returns RAW chord name from vocabulary (e.g., "Fs" not "F#")
   * Use formatChordForDisplay() to convert for UI display
   */
  async predictNextChord(currentChords, genre, adventure) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    console.log('[DEBUG] ========== predictNextChord ==========');
    console.log('[DEBUG] Input:', JSON.stringify({ currentChords, genre, adventure }));

    return tf.tidy(() => {
      const tokenToInt = this.mappings;
      const PAD_ID = tokenToInt['<PAD>'] !== undefined ? tokenToInt['<PAD>'] : 14;
      const START_ID = tokenToInt['<START>'] !== undefined ? tokenToInt['<START>'] : 15;

      // Genre Handling
      const genreLower = genre ? genre.toLowerCase() : 'pop';
      const genreToken = `<GENRE=${genreLower}>`;
      let genreId = tokenToInt[genreToken];

      console.log('[DEBUG] Genre Token:', genreToken, '-> ID:', genreId);

      if (genreId === undefined) {
        console.warn('[DEBUG] Genre not found! Defaulting to pop.');
        genreId = tokenToInt['<GENRE=pop>'];
        if (genreId === undefined) {
          const firstGenre = Object.keys(tokenToInt).find(k => k.startsWith('<GENRE='));
          genreId = firstGenre ? tokenToInt[firstGenre] : 1;
        }
      }

      // Convert chords to IDs (chords should be in RAW vocabulary format)
      const chordIds = currentChords.map(chord => {
        const id = tokenToInt[chord];
        if (id === undefined) {
          console.warn('[DEBUG] Chord NOT FOUND in vocab:', chord, '-> Using PAD');
        } else {
          console.log('[DEBUG] Chord:', chord, '-> ID:', id);
        }
        return id !== undefined ? id : PAD_ID;
      });

      // Sequence Construction
      const SEQUENCE_LENGTH = 5;
      const MAX_HISTORY = SEQUENCE_LENGTH - 2;

      let historyIds = [];
      if (chordIds.length >= MAX_HISTORY) {
        historyIds = chordIds.slice(chordIds.length - MAX_HISTORY);
      } else {
        const paddingCount = MAX_HISTORY - chordIds.length;
        const padding = new Array(paddingCount).fill(PAD_ID);
        historyIds = [...padding, ...chordIds];
      }

      const inputIds = [genreId, START_ID, ...historyIds];
      console.log('[DEBUG] Final Input IDs:', inputIds);
      console.log('[DEBUG] Input Tokens:', inputIds.map(id => this.idToToken[id]));

      const inputTensor = tf.tensor2d([inputIds], [1, SEQUENCE_LENGTH]);

      // Prediction
      const prediction = this.model.predict(inputTensor);
      let probabilities = prediction.squeeze();
      let probsArray = probabilities.arraySync();

      // Find top 5 predictions BEFORE penalty
      const top5Before = probsArray
        .map((p, i) => ({ p, i, token: this.idToToken[i] }))
        .sort((a, b) => b.p - a.p)
        .slice(0, 5);
      console.log('[DEBUG] Top 5 BEFORE Penalty:', top5Before.map(item => `${item.token} (${(item.p * 100).toFixed(2)}%)`));

      // Repetition Penalty
      if (historyIds.length > 0) {
        const lastChordId = historyIds[historyIds.length - 1];
        if (lastChordId !== undefined && lastChordId < probsArray.length && lastChordId !== PAD_ID && lastChordId !== START_ID) {
          console.log('[DEBUG] Applying Hard Ban to:', this.idToToken[lastChordId], '(ID:', lastChordId, ')');
          probsArray[lastChordId] = 0;
          const sum = probsArray.reduce((a, b) => a + b, 0);
          if (sum > 0) {
            probsArray = probsArray.map(p => p / sum);
          }
          probabilities = tf.tensor1d(probsArray);
        }
      }

      // Find top 5 AFTER penalty
      const top5After = probsArray
        .map((p, i) => ({ p, i, token: this.idToToken[i] }))
        .sort((a, b) => b.p - a.p)
        .slice(0, 5);
      console.log('[DEBUG] Top 5 AFTER Penalty:', top5After.map(item => `${item.token} (${(item.p * 100).toFixed(2)}%)`));

      // Sampling
      const temperature = 0.2 + (adventure / 100);
      const topP = 0.9;
      console.log('[DEBUG] Sampling Params:', { temperature, topP });

      const predictedId = this.sampleWithTopP(probabilities, topP, temperature);
      const predictedToken = this.idToToken[predictedId];

      console.log('[DEBUG] Sampled ID:', predictedId, '-> Token:', predictedToken);

      if (!predictedToken || predictedToken.startsWith('<')) {
        console.warn('[DEBUG] Predicted a special token! Falling back to C');
        return 'C';
      }

      // Return RAW token (not formatted) - this is critical for proper lookups
      console.log('[DEBUG] Final Output (RAW):', predictedToken);
      console.log('[DEBUG] ==========================================');
      return predictedToken;
    });
  }

  /**
   * Format chord for UI display only
   * Converts vocabulary notation to standard music notation:
   * - "Fs" -> "F#", "Cs" -> "C#" (sharps)
   * - But preserves "sus" -> "sus" (suspended chords)
   */
  formatChordForDisplay(chord) {
    if (!chord) return chord;

    // Only replace 's' with '#' when it follows a note letter (A-G) and optional 'b'
    // AND is NOT followed by 'us' (which would make it part of 'sus')
    return chord.replace(/^([A-G]b?)s(?!us)/, '$1#');
  }

  sampleWithTopP(probabilities, topP, temperature) {
    const probs = probabilities.arraySync();
    const temp = Math.max(temperature, 0.01);
    const logits = probs.map(p => Math.log(p + 1e-10) / temp);
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const scaledProbs = expLogits.map(e => e / sumExp);

    const sortedIndices = scaledProbs
      .map((p, i) => ({ p, i }))
      .sort((a, b) => b.p - a.p);

    let cumulativeSum = 0;
    const topIndices = [];

    for (const item of sortedIndices) {
      cumulativeSum += item.p;
      topIndices.push(item);
      if (cumulativeSum >= topP) {
        break;
      }
    }

    const topSum = topIndices.reduce((sum, item) => sum + item.p, 0);
    const renormalizedTop = topIndices.map(item => ({
      i: item.i,
      p: item.p / topSum
    }));

    const r = Math.random();
    let cumulative = 0;
    for (const item of renormalizedTop) {
      cumulative += item.p;
      if (r < cumulative) {
        return item.i;
      }
    }

    return renormalizedTop[0].i;
  }

  /**
   * Get a random starting chord based on adventurousness
   * Returns RAW chord name from vocabulary
   */
  getRandomStartChord(adventure) {
    console.log('[DEBUG] getRandomStartChord called with adventure:', adventure);
    if (!this.chords || this.chords.length === 0) {
      console.warn('[DEBUG] No chords available! Returning C');
      return 'C';
    }

    let candidates = [];

    if (adventure < 30) {
      candidates = this.chords.filter(c => /^[A-G][bs]?(m)?$/.test(c));
      if (candidates.length === 0) candidates = ['C', 'G', 'F', 'Am'];
      console.log('[DEBUG] Low Adventure - Simple Triads:', candidates.length, 'candidates');
    }
    else if (adventure < 70) {
      candidates = this.chords.filter(c => /^[A-G][bs]?(m)?(7|sus|dim)?$/.test(c));
      console.log('[DEBUG] Medium Adventure - Including 7ths:', candidates.length, 'candidates');
    }
    else {
      candidates = this.chords;
      console.log('[DEBUG] High Adventure - All Chords:', candidates.length, 'candidates');
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const result = candidates[randomIndex];
    console.log('[DEBUG] Selected Start Chord (RAW):', result);
    // Return RAW chord - no formatting!
    return result;
  }

  detectKey(chordList) {
    if (!chordList || chordList.length === 0) return 'C Major';
    try {
      // Convert raw chord to display format for Tonal.js parsing
      const firstChord = this.formatChordForDisplay(chordList[0]);
      const chordInfo = Chord.get(firstChord);
      if (chordInfo && chordInfo.tonic) {
        const isMinor = firstChord.includes('m') && !firstChord.includes('maj');
        return `${chordInfo.tonic} ${isMinor ? 'Minor' : 'Major'}`;
      }
    } catch (e) {
      console.warn('[DEBUG] Key detection failed:', e);
    }
    return 'C Major';
  }
}

const modelService = new ModelService();
export default modelService;
