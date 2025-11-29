import * as tf from '@tensorflow/tfjs';
import { Key } from '@tonaljs/tonal';

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

      // Map chords to IDs
      const chordToId = this.mappings.chord_to_id;
      const sequenceIds = currentChords.map(chord => {
        // Handle potential unknown chords
        return chordToId[chord] || 0; // 0 is usually padding/unknown, assuming 0 is safe default if not found
      });

      // Pad sequence to length 8 (pre-padding with 0)
      const SEQUENCE_LENGTH = 8;
      let paddedSequence = [];
      if (sequenceIds.length >= SEQUENCE_LENGTH) {
        paddedSequence = sequenceIds.slice(sequenceIds.length - SEQUENCE_LENGTH);
      } else {
        const paddingCount = SEQUENCE_LENGTH - sequenceIds.length;
        const padding = new Array(paddingCount).fill(0);
        paddedSequence = [...padding, ...sequenceIds];
      }

      // Map genre to ID
      const genreToId = this.mappings.genre_to_id;
      // Default to first genre if not found or 'pop' if available, otherwise 0
      let genreId = genreToId[genre];
      if (genreId === undefined) {
        console.warn(`Genre '${genre}' not found in mappings, defaulting to 0`);
        genreId = 0;
      }

      // Create tensors
      // Input 1: Chord Sequence [1, 8]
      const chordTensor = tf.tensor2d([paddedSequence], [1, SEQUENCE_LENGTH]);

      // Input 2: Genre [1, 1]
      const genreTensor = tf.tensor2d([[genreId]], [1, 1]);

      // 2. Prediction
      const prediction = this.model.predict([chordTensor, genreTensor]);

      // 3. Post-processing (Temperature Sampling)

      // Map adventure (0-100) to temperature (0.2 - 1.2)
      // 0 -> 0.2 (Conservative)
      // 100 -> 1.2 (Creative/Random)
      const temperature = 0.2 + (adventure / 100);

      // Get logits (assuming model outputs logits or probabilities, usually softmaxed)
      // If model outputs probabilities, we need to take log to get logits for sampling
      // Let's assume the model output is a softmax probability distribution
      const probabilities = prediction.squeeze();

      // Sample from distribution
      const predictedId = this.sampleWithTemperature(probabilities, temperature);

      // Convert ID back to Chord Name
      const idToChord = this.mappings.id_to_chord;
      const predictedChord = idToChord[predictedId.toString()]; // Keys in JSON are strings

      return predictedChord || 'C'; // Fallback to C if something goes wrong
    });
  }

  /**
   * Sample from a probability distribution with temperature
   * @param {tf.Tensor} probabilities - 1D tensor of probabilities
   * @param {number} temperature - Sampling temperature
   * @returns {number} - Sampled index
   */
  sampleWithTemperature(probabilities, temperature) {
    const probs = probabilities.arraySync();

    // Apply temperature
    // log(p) / T
    const logits = probs.map(p => Math.log(p + 1e-10) / temperature);

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

    // Use tonaljs to detect key
    const detected = Key.detect(chordList);

    if (detected && detected.length > 0) {
      // Return the most likely key
      return detected[0];
    }

    return 'Unknown';
  }
}

// Singleton instance
const modelService = new ModelService();
export default modelService;
