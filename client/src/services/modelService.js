import * as tf from '@tensorflow/tfjs';
import { Chord } from '@tonaljs/tonal';

// Define custom NotEqual layer for masking
class NotEqual extends tf.layers.Layer {
  constructor(config) {
    super(config);
  }

  computeOutputShape(inputShape) {
    return inputShape;
  }

  call(inputs) {
    return tf.tidy(() => {
      // inputs is usually a tensor, check if it's not equal to 0
      // The model json shows it comparing against 0
      return tf.notEqual(inputs[0], 0);
    });
  }

  static get className() {
    return 'NotEqual';
  }
}

// Register the custom layer
tf.serialization.registerClass(NotEqual);

class ModelService {
  constructor() {
    this.model = null;
    this.mappings = null;
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
      // Wait for existing load to finish
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;

    try {
      console.log('Loading model and mappings...');

      // Load mappings and model in parallel
      const [mappingsResponse, model] = await Promise.all([
        fetch(this.mappingsPath),
        tf.loadLayersModel(this.modelPath)
      ]);

      this.mappings = await mappingsResponse.json();
      this.model = model;

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
      const chordToId = this.mappings.chord_to_id;
      const sequenceIds = currentChords.map(chord => {
        const id = chordToId[chord];
        return id !== undefined ? id : 0; // Default to 0 if unknown
      });

      // Pad sequence to length 8
      const SEQUENCE_LENGTH = 8;
      let paddedSequence = [];
      if (sequenceIds.length >= SEQUENCE_LENGTH) {
        paddedSequence = sequenceIds.slice(sequenceIds.length - SEQUENCE_LENGTH);
      } else {
        const paddingCount = SEQUENCE_LENGTH - sequenceIds.length;
        const padding = new Array(paddingCount).fill(0);
        paddedSequence = [...padding, ...sequenceIds];
      }

      // Map genre
      const genreToId = this.mappings.genre_to_id;
      let genreId = genreToId[genre];
      if (genreId === undefined) {
        genreId = 0;
      }

      // Create tensors
      const chordTensor = tf.tensor2d([paddedSequence], [1, SEQUENCE_LENGTH]);
      const genreTensor = tf.tensor2d([[genreId]], [1, 1]);

      // 2. Prediction
      const prediction = this.model.predict([chordTensor, genreTensor]);
      let probabilities = prediction.squeeze();
      let probsArray = probabilities.arraySync();

      // 3. Hard Ban Repetition Penalty
      if (sequenceIds.length > 0) {
        const lastChordId = sequenceIds[sequenceIds.length - 1];
        if (lastChordId !== undefined && lastChordId < probsArray.length) {
          // Force probability of the last chord to 0
          probsArray[lastChordId] = 0;

          // Renormalize
          const sum = probsArray.reduce((a, b) => a + b, 0);
          if (sum > 0) {
            probsArray = probsArray.map(p => p / sum);
          }

          // Update probabilities tensor
          probabilities = tf.tensor1d(probsArray);
        }
      }

      // 4. Sampling
      const temperature = 0.2 + (adventure / 100);
      const predictedId = this.sampleWithTemperature(probabilities, temperature);

      const idToChord = this.mappings.id_to_chord;
      const rawChord = idToChord[predictedId.toString()] || 'C';

      return this.formatChord(rawChord);
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

    // Avoid division by zero or extremely low temperature
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
      // This is often true for generated progressions starting on I
      const firstChord = chordList[0];
      const chordInfo = Chord.get(firstChord);

      if (chordInfo && chordInfo.tonic) {
        // Determine if major or minor
        // The 'quality' property from tonaljs can be 'Major', 'Minor', 'Major7', etc.
        // For simplicity, we'll check the chord name for 'm' to infer minor,
        // as tonaljs's quality might be more specific than just 'Major' or 'Minor' for the key.
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
