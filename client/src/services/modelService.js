import * as tf from '@tensorflow/tfjs';
import { Chord, Note, Interval } from '@tonaljs/tonal';
import { toRomanNumerals as tonalChordListToRoman } from '@tonaljs/progression';

class ModelService {
  constructor() {
    this.model = null;
    this.mappings = null;
    this.idToToken = null;
    this.genres = [];
    this.sections = [];
    this.chords = [];
    this.specialTokenIds = [];
    this.isLoaded = false;
    this.isLoading = false;
    this.modelPath = '/model/web_model/model.json';
    this.mappingsPath = '/model/mappings.json';
    this.debugEnabled = import.meta.env.DEV;
  }

  debug(...args) {
    if (this.debugEnabled) {
      console.log(...args);
    }
  }

  debugWarn(...args) {
    if (this.debugEnabled) {
      console.warn(...args);
    }
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
      this.debug('[DEBUG] Starting model and mappings load...');

      const [mappingsResponse, model] = await Promise.all([
        fetch(this.mappingsPath),
        tf.loadLayersModel(this.modelPath)
      ]);

      const rawMappings = await mappingsResponse.json();
      this.mappings = rawMappings.token_to_int;
      this.model = model;

      this.debug('[DEBUG] Mappings Loaded:', Object.keys(this.mappings).length, 'tokens');

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

      // Section conditioning tokens (e.g. <SECTION=verse>) — extracted like genres.
      this.sections = tokens
        .filter(token => token.startsWith('<SECTION='))
        .map(token => token.replace('<SECTION=', '').replace('>', ''))
        .sort();

      this.chords = tokens.filter(token => !token.startsWith('<'));

      // IDs of all <...> tokens — zeroed out before sampling so generation can
      // only ever produce real chords.
      this.specialTokenIds = tokens
        .filter(token => token.startsWith('<'))
        .map(token => this.mappings[token]);

      this.debug('[DEBUG] Available Genres:', this.genres);
      this.debug('[DEBUG] Available Sections:', this.sections);
      this.debug('[DEBUG] Available Chords Count:', this.chords.length);
      this.debug('[DEBUG] Special Token IDs:', {
        PAD: this.mappings['<PAD>'],
        START: this.mappings['<START>'],
        END: this.mappings['<END>']
      });

      this.isLoaded = true;
      this.debug('[DEBUG] Model and mappings loaded successfully!');
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
   * Predict the next chord in the sequence.
   * Returns { chord, candidates } where:
   *   - chord: RAW chord token from the vocabulary (e.g. "F#m") — the sampled pick.
   *   - candidates: top probability candidates from the final (masked, renormalized)
   *     distribution as [{ token, prob }], with the sampled chord guaranteed present.
   *     This powers the "model's brain" UI (interpretability), so the jury can see
   *     what the model considered and why the adventure slider picked a non-top choice.
   * Use formatChordForDisplay() to convert tokens for UI display.
   */
  async predictNextChord(currentChords, genre, adventure, section = 'any') {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    this.debug('[DEBUG] ========== predictNextChord ==========');
    this.debug('[DEBUG] Input:', JSON.stringify({ currentChords, genre, adventure, section }));

    return tf.tidy(() => {
      const tokenToInt = this.mappings;
      const PAD_ID = tokenToInt['<PAD>'] !== undefined ? tokenToInt['<PAD>'] : 14;
      const START_ID = tokenToInt['<START>'] !== undefined ? tokenToInt['<START>'] : 22;

      // Genre Handling
      const genreLower = genre ? genre.toLowerCase() : 'pop';
      const genreToken = `<GENRE=${genreLower}>`;
      let genreId = tokenToInt[genreToken];

      this.debug('[DEBUG] Genre Token:', genreToken, '-> ID:', genreId);

      if (genreId === undefined) {
        this.debugWarn('[DEBUG] Genre not found! Defaulting to pop.');
        genreId = tokenToInt['<GENRE=pop>'];
        if (genreId === undefined) {
          const firstGenre = Object.keys(tokenToInt).find(k => k.startsWith('<GENRE='));
          genreId = firstGenre ? tokenToInt[firstGenre] : 1;
        }
      }

      // Section Handling — replaces the legacy <START> slot in the input sequence.
      const sectionLower = section ? section.toLowerCase() : 'any';
      const sectionToken = `<SECTION=${sectionLower}>`;
      let sectionId = tokenToInt[sectionToken];

      this.debug('[DEBUG] Section Token:', sectionToken, '-> ID:', sectionId);

      if (sectionId === undefined) {
        this.debugWarn('[DEBUG] Section not found! Defaulting to any.');
        sectionId = tokenToInt['<SECTION=any>'];
        if (sectionId === undefined) {
          const firstSection = Object.keys(tokenToInt).find(k => k.startsWith('<SECTION='));
          sectionId = firstSection ? tokenToInt[firstSection] : 15;
        }
      }

      // Convert chords to IDs (chords should be in RAW vocabulary format)
      const chordIds = currentChords.map(chord => {
        const id = tokenToInt[chord];
        if (id === undefined) {
          this.debugWarn('[DEBUG] Chord NOT FOUND in vocab:', chord, '-> Using PAD');
        } else {
          this.debug('[DEBUG] Chord:', chord, '-> ID:', id);
        }
        return id !== undefined ? id : PAD_ID;
      });

      // Sequence Construction
      // Input layout: [genre, section, c1, c2, c3, c4] (length 6, context window = 4 chords)
      // Training sequences are ['<START>', ...chords] (preprocess_data.py), so the
      // context must contain <START> while fewer than 4 chords exist — one chord is
      // [PAD, PAD, START, c1]. Without it the model sees a pattern it was never
      // trained on and the next-chord distribution collapses to near-uniform.
      const SEQUENCE_LENGTH = 6;
      const MAX_HISTORY = SEQUENCE_LENGTH - 2;

      const historyIds = [START_ID, ...chordIds].slice(-MAX_HISTORY);
      while (historyIds.length < MAX_HISTORY) {
        historyIds.unshift(PAD_ID);
      }

      const inputIds = [genreId, sectionId, ...historyIds];
      this.debug('[DEBUG] Final Input IDs:', inputIds);
      this.debug('[DEBUG] Input Tokens:', inputIds.map(id => this.idToToken[id]));

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
      this.debug('[DEBUG] Top 5 BEFORE Penalty:', top5Before.map(item => `${item.token} (${(item.p * 100).toFixed(2)}%)`));

      // Mask special tokens (<PAD>, <START>, <END>, <GENRE=*>, <SECTION=*>) before
      // sampling so only real chords can come out — mirrors generate.py. Without
      // this, sections with high P(<END>) (e.g. bridge) leak into the nucleus.
      for (const specialId of this.specialTokenIds) {
        if (specialId < probsArray.length) {
          probsArray[specialId] = 0;
        }
      }

      // Repetition Penalty: hard ban on immediate repeat
      const lastChordId = historyIds[historyIds.length - 1];
      if (lastChordId !== undefined && lastChordId < probsArray.length && lastChordId !== PAD_ID && lastChordId !== START_ID) {
        this.debug('[DEBUG] Applying Hard Ban to:', this.idToToken[lastChordId], '(ID:', lastChordId, ')');
        probsArray[lastChordId] = 0;
      }

      const maskedSum = probsArray.reduce((a, b) => a + b, 0);
      if (maskedSum > 0) {
        probsArray = probsArray.map(p => p / maskedSum);
      }
      probabilities = tf.tensor1d(probsArray);

      // Find top 5 AFTER penalty
      const top5After = probsArray
        .map((p, i) => ({ p, i, token: this.idToToken[i] }))
        .sort((a, b) => b.p - a.p)
        .slice(0, 5);
      this.debug('[DEBUG] Top 5 AFTER Penalty:', top5After.map(item => `${item.token} (${(item.p * 100).toFixed(2)}%)`));

      // Sampling
      const temperature = 0.2 + (adventure / 100);
      const topP = 0.9;
      this.debug('[DEBUG] Sampling Params:', { temperature, topP });

      const predictedId = this.sampleWithTopP(probabilities, topP, temperature);
      let predictedToken = this.idToToken[predictedId];

      this.debug('[DEBUG] Sampled ID:', predictedId, '-> Token:', predictedToken);

      if (!predictedToken || predictedToken.startsWith('<')) {
        // Unreachable in practice — special tokens are zeroed before sampling.
        // Defensive: pick the most probable real chord, not a hardcoded C.
        this.debugWarn('[DEBUG] Sampled a masked token, falling back to argmax chord');
        let bestId = -1;
        for (let i = 0; i < probsArray.length; i++) {
          const tok = this.idToToken[i];
          if (tok && !tok.startsWith('<') && (bestId === -1 || probsArray[i] > probsArray[bestId])) {
            bestId = i;
          }
        }
        predictedToken = bestId >= 0 ? this.idToToken[bestId] : 'C';
      }

      // Interpretability data: top real-chord candidates from the final
      // (masked, renormalized) distribution. The sampled chord is guaranteed
      // present so the UI can always mark which one the model actually chose.
      const candidates = probsArray
        .map((prob, i) => ({ token: this.idToToken[i], prob }))
        .filter(({ token }) => token && !token.startsWith('<'))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 5);
      if (!candidates.some(c => c.token === predictedToken)) {
        candidates.push({ token: predictedToken, prob: probsArray[predictedId] || 0 });
      }

      // Return RAW token (not formatted) - this is critical for proper lookups
      this.debug('[DEBUG] Final Output (RAW):', predictedToken);
      this.debug('[DEBUG] ==========================================');
      return { chord: predictedToken, candidates };
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

  formatChordWithSymbols(chord) {
    const display = this.formatChordForDisplay(chord);
    if (!display) return display;
    return display.replace(/b/g, '♭').replace(/#/g, '♯');
  }

  formatDisplayChordWithSymbols(displayChord) {
    if (!displayChord) return displayChord;
    return displayChord.replace(/b/g, '♭').replace(/#/g, '♯');
  }

  /**
   * Convert display chord string back to raw vocabulary token (inverse of formatChordForDisplay).
   * The v3 vocabulary uses '#' natively (e.g. "F#m7"), so the display string is already a
   * valid raw token — no '#' -> 's' conversion is needed.
   */
  displayToRawToken(display) {
    if (!display) return display;
    return display;
  }

  /**
   * Transpose a single chord (raw vocabulary token) by semitones; returns raw token.
   */
  simplifyNoteName(noteName) {
    if (!noteName) return noteName;
    const avoid = new Set(['Cb', 'Fb', 'E#', 'B#']);
    if (noteName.includes('bb') || noteName.includes('##') || avoid.has(noteName)) {
      return Note.enharmonic(noteName) || noteName;
    }
    return noteName;
  }

  transposeChord(rawChord, semitones) {
    if (!rawChord || semitones === 0) return rawChord;
    const display = this.formatChordForDisplay(rawChord);
    const info = Chord.get(display);

    let newDisplay;
    if (info && info.tonic) {
      const newTonic = this.simplifyNoteName(
        Note.transpose(info.tonic, Interval.fromSemitones(semitones))
      );
      newDisplay = newTonic + display.slice(info.tonic.length);
    } else {
      const m = display.match(/^([A-G][#b]?)/);
      if (!m) return rawChord;
      const newTonic = this.simplifyNoteName(
        Note.transpose(m[1], Interval.fromSemitones(semitones))
      );
      newDisplay = newTonic + display.slice(m[1].length);
    }

    const transposedRaw = this.displayToRawToken(newDisplay);

    // Keep progression tokens vocabulary-safe to avoid PAD fallback degradation later.
    if (
      this.mappings &&
      Object.prototype.hasOwnProperty.call(this.mappings, transposedRaw)
    ) {
      return transposedRaw;
    }
    if (Array.isArray(this.chords) && this.chords.includes(transposedRaw)) {
      return transposedRaw;
    }

    this.debugWarn('[DEBUG] Transposed chord not in vocabulary, keeping original:', {
      from: rawChord,
      attempted: transposedRaw,
      semitones,
    });
    return rawChord;
  }

  getChroma(rawChord) {
    if (!rawChord) return null;
    const display = this.formatChordForDisplay(rawChord);
    const root = this.getRootFromDisplay(display);
    if (!root) return null;
    const c = Note.chroma(root);
    return c !== undefined ? c : null;
  }

  getRootFromDisplay(displayChord) {
    if (!displayChord) return null;
    const m = displayChord.match(/^([A-G][#b]?)/);
    return m ? m[1] : null;
  }

  transposeProgression(chords, semitones) {
    if (!chords?.length || semitones === 0) return chords;
    return chords.map((c) => this.transposeChord(c, semitones));
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
    this.debug('[DEBUG] getRandomStartChord called with adventure:', adventure);
    if (!this.chords || this.chords.length === 0) {
      this.debugWarn('[DEBUG] No chords available! Returning C');
      return 'C';
    }

    let candidates = [];

    if (adventure < 30) {
      candidates = this.chords.filter(c => /^[A-G][b#s]?(m)?$/.test(c));
      if (candidates.length === 0) candidates = ['C', 'G', 'F', 'Am'];
      this.debug('[DEBUG] Low Adventure - Simple Triads:', candidates.length, 'candidates');
    }
    else if (adventure < 70) {
      candidates = this.chords.filter(c => /^[A-G][b#s]?(m)?(7|sus|dim)?$/.test(c));
      this.debug('[DEBUG] Medium Adventure - Including 7ths:', candidates.length, 'candidates');
    }
    else {
      candidates = this.chords;
      this.debug('[DEBUG] High Adventure - All Chords:', candidates.length, 'candidates');
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const result = candidates[randomIndex];
    this.debug('[DEBUG] Selected Start Chord (RAW):', result);
    // Return RAW chord - no formatting!
    return result;
  }

  /**
   * Normalize a tonal numeral to standard theory notation:
   * minor chords get lowercase numerals ("VIm" → "vi", "IIm7" → "ii7"),
   * diminished become lowercase + ° ("VIIdim" → "vii°"), and in minor keys
   * the diatonic bIII/bVI/bVII lose their flat ("bVII" → "VII").
   */
  formatRomanNumeral(numeral, mode) {
    if (!numeral) return numeral;
    let n = String(numeral).trim();
    if (mode === 'minor') {
      n = n.replace(/^b(III|VI|VII)/, '$1');
    }
    const m = n.match(/^([b#]?)([IV]+)(.*)$/i);
    if (!m) return n;
    const [, accidental, roman, quality] = m;
    if (/^m(?!aj)/.test(quality)) {
      return accidental + roman.toLowerCase() + quality.slice(1);
    }
    if (quality.startsWith('dim')) {
      return accidental + roman.toLowerCase() + '°' + quality.slice(3);
    }
    return accidental + roman.toUpperCase() + quality;
  }

  /**
   * Roman numerals relative to detected key (e.g. "C Major" → tonic C).
   * tonal's toRomanNumerals expects ONLY the tonic ("C", not "C major" —
   * the latter silently degrades to quality suffixes like "m7 7 maj7").
   */
  chordsToRomanNumerals(rawChords, detectedKey) {
    if (!rawChords?.length) return [];
    const m = detectedKey?.match(/^([A-G][#b]?)\s+(Major|Minor)/i);
    const tonic = m ? m[1] : 'C';
    const mode = m ? m[2].toLowerCase() : 'major';
    const displayChords = rawChords.map((c) => this.formatChordForDisplay(c));
    try {
      const numerals = tonalChordListToRoman(tonic, displayChords);
      return displayChords.map((_, index) => {
        const rn = numerals?.[index];
        return rn && String(rn).trim() ? this.formatRomanNumeral(rn, mode) : '?';
      });
    } catch {
      return displayChords.map(() => '?');
    }
  }

  /**
   * Key detection via diatonic-coverage scoring over all 24 keys.
   * Each chord contributes the root-weighted fraction of its tones that fit
   * the candidate scale; tonic-root chords and first/last-chord anchors add
   * small bonuses (so relative major/minor resolve to the actual tonal
   * center, e.g. Am-F-C-G → A Minor but C-G-Am-F → C Major). Minor scales
   * include the raised 7th so the harmonic-minor V/V7 is not penalized.
   */
  detectKey(chordList) {
    if (!chordList || chordList.length === 0) return 'C Major';
    try {
      const TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
      const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
      const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10, 11];

      const parsed = [];
      for (const rawChord of chordList) {
        const display = this.formatChordForDisplay(rawChord);
        const info = Chord.get(display);
        const rootName = info?.tonic || this.getRootFromDisplay(display);
        const rootChroma = rootName ? Note.chroma(rootName) : undefined;
        if (rootChroma === undefined || rootChroma === null) continue;

        let tones = (info?.notes || [])
          .map((n) => Note.chroma(n))
          .filter((c) => c !== undefined && c !== null);
        if (!tones.length) tones = [rootChroma];

        const quality = display.slice(rootName.length);
        const family = /^m(?!aj)/.test(quality)
          ? 'minor'
          : quality.startsWith('dim')
            ? 'dim'
            : 'major';
        parsed.push({ rootChroma, tones, family });
      }
      if (!parsed.length) return 'C Major';

      let best = { score: -Infinity, name: 'C Major' };
      for (let tonic = 0; tonic < 12; tonic++) {
        for (const mode of ['major', 'minor']) {
          const steps = mode === 'major' ? MAJOR_STEPS : MINOR_STEPS;
          const scale = new Set(steps.map((s) => (tonic + s) % 12));

          let score = 0;
          parsed.forEach((chord, index) => {
            let weightTotal = 0;
            let weightInScale = 0;
            for (const tone of chord.tones) {
              const w = tone === chord.rootChroma ? 2 : 1;
              weightTotal += w;
              if (scale.has(tone)) weightInScale += w;
            }
            score += weightTotal ? weightInScale / weightTotal : 0;

            if (chord.rootChroma === tonic) {
              if (chord.family === mode) score += 0.2;
              if (index === 0) score += 0.4;
              if (index === parsed.length - 1) score += 0.3;
            }
          });

          if (score > best.score) {
            best = { score, name: `${TONICS[tonic]} ${mode === 'major' ? 'Major' : 'Minor'}` };
          }
        }
      }
      return best.name;
    } catch (e) {
      this.debugWarn('[DEBUG] Key detection failed:', e);
    }
    return 'C Major';
  }
}

const modelService = new ModelService();
export default modelService;
