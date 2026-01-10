import * as tf from '@tensorflow/tfjs';
import { Chord } from '@tonaljs/tonal';

class ModelService {
  constructor() {
    this.model = null;
    this.mappings = null; // Will hold token_to_int
    this.idToToken = null;
    this.genres = [];
    this.chords = [];
    this.isLoaded = false;
    this.isLoading = false;
    this.modelPath = '/model/web_model/model.json';
    this.mappingsPath = '/model/mappings.json';
  }

  /**
   * Load the TensorFlow.js model and mappings
   */
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
      console.log('Loading model and mappings...');

      const [mappingsResponse, model] = await Promise.all([
        fetch(this.mappingsPath),
        tf.loadLayersModel(this.modelPath)
      ]);

      const rawMappings = await mappingsResponse.json();
      this.mappings = rawMappings.token_to_int;
      this.model = model;

      // Generate reverse mapping (id -> token)
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

      this.chords = tokens.filter(token => !token.startsWith('<')); // Exclude special tokens

      console.log('Loaded Genres:', this.genres);

      this.isLoaded = true;
      console.log('Model and mappings loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load model or mappings:', error);
      this.isLoaded = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Predict the next chord in the sequence
   */
  async predictNextChord(currentChords, genre, adventure) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    return tf.tidy(() => {
      const tokenToInt = this.mappings;
      const PAD_ID = tokenToInt['<PAD>'] !== undefined ? tokenToInt['<PAD>'] : 14;
      const START_ID = tokenToInt['<START>'] !== undefined ? tokenToInt['<START>'] : 15;

      // Genre Handling
      const genreLower = genre ? genre.toLowerCase() : 'pop';
      const genreToken = `<GENRE=${genreLower}>`;
      let genreId = tokenToInt[genreToken];

      if (genreId === undefined) {
        console.warn(`Genre '${genre}' not found. Defaulting to 'pop'.`);
        genreId = tokenToInt['<GENRE=pop>'];
        if (genreId === undefined) {
          const firstGenre = Object.keys(tokenToInt).find(k => k.startsWith('<GENRE='));
          genreId = firstGenre ? tokenToInt[firstGenre] : 1;
        }
      }

      // Convert chords
      const chordIds = currentChords.map(chord => {
        const id = tokenToInt[chord];
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
      const inputTensor = tf.tensor2d([inputIds], [1, SEQUENCE_LENGTH]);

      // Prediction
      const prediction = this.model.predict(inputTensor);
      let probabilities = prediction.squeeze();
      let probsArray = probabilities.arraySync();

      // Repetition Penalty (Hard Ban on last chord)
      if (historyIds.length > 0) {
        const lastChordId = historyIds[historyIds.length - 1];
        if (lastChordId !== undefined && lastChordId < probsArray.length && lastChordId !== PAD_ID && lastChordId !== START_ID) {
          probsArray[lastChordId] = 0;
          const sum = probsArray.reduce((a, b) => a + b, 0);
          if (sum > 0) {
            probsArray = probsArray.map(p => p / sum);
          }
          probabilities = tf.tensor1d(probsArray);
        }
      }

      // Sampling
      const temperature = 0.2 + (adventure / 100);
      const topP = 0.9;
      const predictedId = this.sampleWithTopP(probabilities, topP, temperature);
      const predictedToken = this.idToToken[predictedId];

      if (!predictedToken || predictedToken.startsWith('<')) {
        return 'C';
      }

      return this.formatChord(predictedToken);
    });
  }

  formatChord(chord) {
    if (!chord) return chord;
    return chord
      .replace('min', 'm')
      .replace(/s/g, '#');
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
   * @param {number} adventure - 0 to 100
   * @returns {string} - A random chord
   */
  getRandomStartChord(adventure) {
    if (!this.chords || this.chords.length === 0) return 'C';

    let candidates = [];

    // Low Adventure (0-30): Simple Triads
    if (adventure < 30) {
      candidates = this.chords.filter(c => /^[A-G][b#]?(m)?$/.test(c));
      // Fallback if empty (shouldn't be)
      if (candidates.length === 0) candidates = ['C', 'G', 'F', 'Am'];
    }
    // Medium (30-70): Includes 7ths and sus
    else if (adventure < 70) {
      candidates = this.chords.filter(c => /^[A-G][b#]?(m)?(7|sus|dim)?$/.test(c));
    }
    // High (70+): Anything goes
    else {
      candidates = this.chords;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    return this.formatChord(candidates[randomIndex]);
  }

  detectKey(chordList) {
    if (!chordList || chordList.length === 0) return 'C Major';
    try {
      const firstChord = chordList[0];
      const chordInfo = Chord.get(firstChord);
      if (chordInfo && chordInfo.tonic) {
        const isMinor = firstChord.includes('m') && !firstChord.includes('maj');
        return `${chordInfo.tonic} ${isMinor ? 'Minor' : 'Major'}`;
      }
    } catch (e) {
      console.warn('Key detection failed:', e);
    }
    return 'C Major';
  }
}

const modelService = new ModelService();
export default modelService;
