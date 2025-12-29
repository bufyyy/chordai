import * as tf from '@tensorflow/tfjs';
import { Chord } from '@tonaljs/tonal';

class ModelService {
  constructor() {
    this.model = null;
    this.mappings = null; // Will hold token_to_int
    this.idToToken = null;
    this.genres = [];
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

      // Extract genres dynamically from tokens
      // Tokens look like "<GENRE=pop>"
      this.genres = Object.keys(this.mappings)
        .filter(token => token.startsWith('<GENRE='))
        .map(token => token.replace('<GENRE=', '').replace('>', ''))
        .sort();

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
   * @param {string[]} currentChords - Array of chord names
   * @param {string} genre - Selected genre
   * @param {number} adventure - Adventure slider value (0-100)
   * @returns {Promise<string>} - The predicted chord name
   */
  async predictNextChord(currentChords, genre, adventure) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    return tf.tidy(() => {
      // 1. Preprocessing
      const tokenToInt = this.mappings;

      // Normalize genre token
      // User passes "pop", we need "<GENRE=pop>"
      const genreLower = genre ? genre.toLowerCase() : 'pop';
      const genreToken = `<GENRE=${genreLower}>`;
      let genreId = tokenToInt[genreToken];

      if (genreId === undefined) {
        console.warn(`Genre '${genre}' not found. Defaulting to 'pop'.`);
        genreId = tokenToInt['<GENRE=pop>'];
        if (genreId === undefined) {
          // Ultimate fallback if pop is missing (unlikely)
          // Use the first available genre ID or 0
          const firstGenre = Object.keys(tokenToInt).find(k => k.startsWith('<GENRE='));
          genreId = firstGenre ? tokenToInt[firstGenre] : 0;
        }
      }

      // Convert chords to IDs
      const chordIds = currentChords.map(chord => {
        // The mappings likely use exact strings from dataset.
        const id = tokenToInt[chord];
        // Fallback to PAD (14) if unknown
        // We should ideally have an UNK token, but PAD is safer than crashing.
        const PAD_ID = tokenToInt['<PAD>'] !== undefined ? tokenToInt['<PAD>'] : 14;
        return id !== undefined ? id : PAD_ID;
      });

      // Construct Sequence: [GENRE, CHORD_1, CHORD_2, CHORD_3, CHORD_4]
      // Total Length = 5
      const SEQUENCE_LENGTH = 5;
      const CHORD_HISTORY_LEN = SEQUENCE_LENGTH - 1; // 4 chords

      // Determine PAD ID
      const padId = tokenToInt['<PAD>'] !== undefined ? tokenToInt['<PAD>'] : 14;

      // Prepare chord history (Last 4)
      let historyIds = [];
      if (chordIds.length >= CHORD_HISTORY_LEN) {
        historyIds = chordIds.slice(chordIds.length - CHORD_HISTORY_LEN);
      } else {
        // Pre-pad with <PAD> if history is short
        const paddingCount = CHORD_HISTORY_LEN - chordIds.length;
        const padding = new Array(paddingCount).fill(padId);
        historyIds = [...padding, ...chordIds];
      }

      // Combine: [Genre, ...History]
      const inputIds = [genreId, ...historyIds];

      // Create tensor [1, 5]
      const inputTensor = tf.tensor2d([inputIds], [1, SEQUENCE_LENGTH]);

      // 2. Prediction
      const prediction = this.model.predict(inputTensor);
      let probabilities = prediction.squeeze();
      let probsArray = probabilities.arraySync();

      // 3. Hard Ban Repetition Penalty
      // Ban the last played chord from being predicted
      // NOTE: We only ban valid CHORDS, not special tokens.
      if (historyIds.length > 0) {
        const lastChordId = historyIds[historyIds.length - 1];

        // Ensure we don't ban special tokens usually, but if the last token was a chord, ban it.
        // We can check if the ID corresponds to a chord (not starting with <)
        // But simply banning the ID is effective enough.

        if (lastChordId !== undefined && lastChordId < probsArray.length && lastChordId !== padId) {
          probsArray[lastChordId] = 0;
          // Renormalize
          const sum = probsArray.reduce((a, b) => a + b, 0);
          if (sum > 0) {
            probsArray = probsArray.map(p => p / sum);
          }
          probabilities = tf.tensor1d(probsArray);
        }
      }

      // 4. Sampling
      const temperature = 0.2 + (adventure / 100);
      const predictedId = this.sampleWithTemperature(probabilities, temperature);

      const predictedToken = this.idToToken[predictedId];

      // Post-processing
      // If predicted token is special (<PAD>, <END>, <START>, <GENRE...>), retry or fallback?
      if (!predictedToken || predictedToken.startsWith('<')) {
        // Fallback to C major if model predicts a special token
        return 'C';
      }

      return this.formatChord(predictedToken);
    });
  }

  /**
   * Format chord name for display
   * @param {string} chord - Raw chord name
   * @returns {string} - Formatted chord name
   */
  formatChord(chord) {
    if (!chord) return chord;
    return chord
      .replace('min', 'm')
      .replace(/s/g, '#'); // Replace 's' with '#' (e.g., Fs -> F#)
  }

  /**
   * Sample from a probability distribution with temperature
   * @param {tf.Tensor} probabilities - 1D tensor of probabilities
   * @param {number} temperature - Sampling temperature
   * @returns {number} - Sampled index
   */
  sampleWithTemperature(probabilities, temperature) {
    const probs = probabilities.arraySync();

    // Avoid division by zero
    const temp = Math.max(temperature, 0.01);

    // Apply temperature: log(p) / T
    const logits = probs.map(p => Math.log(p + 1e-10) / temp);

    // Softmax again
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const scaledProbs = expLogits.map(e => e / sumExp);

    // Sample
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < scaledProbs.length; i++) {
      cumulative += scaledProbs[i];
      if (r < cumulative) {
        return i;
      }
    }

    return scaledProbs.length - 1;
  }

  /**
   * Detect the key of a chord progression
   * @param {string[]} chordList - Array of chord names
   * @returns {string} - Detected key (e.g., "C Major")
   */
  detectKey(chordList) {
    if (!chordList || chordList.length === 0) return 'C Major';

    try {
      // Simple heuristic: Assume the first chord is the tonic
      const firstChord = chordList[0];
      const chordInfo = Chord.get(firstChord);

      if (chordInfo && chordInfo.tonic) {
        const isMinor = firstChord.includes('m') && !firstChord.includes('maj');
        return `${chordInfo.tonic} ${isMinor ? 'Minor' : 'Major'}`;
      }
    } catch (e) {
      console.warn('Key detection failed:', e);
    }
    return 'C Major'; // Fallback
  }
}

// Singleton instance
const modelService = new ModelService();
export default modelService;
