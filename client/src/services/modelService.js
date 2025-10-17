import * as tf from '@tensorflow/tfjs';
import { ChordProgressionPreprocessor } from '../utils/modelUtils';

/**
 * ModelService
 * Advanced model inference service with multiple sampling strategies
 */
export class ModelService {
  constructor() {
    this.model = null;
    this.preprocessor = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.error = null;
  }

  /**
   * Load model and vocabularies
   */
  async loadModel(modelPath = '/model/model.json', metadataPath = '/model/metadata') {
    // If already loaded, return immediately
    if (this.isLoaded) {
      return {
        success: true,
        mode: this.model === 'DEMO_MODE' ? 'demo' : 'model'
      };
    }

    // If already loading, wait for it to complete
    if (this.isLoading) {
      // Wait for loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return {
        success: true,
        mode: this.model === 'DEMO_MODE' ? 'demo' : 'model'
      };
    }

    this.isLoading = true;

    try {
      // Initialize TensorFlow.js
      await tf.ready();
      console.log('TensorFlow.js backend:', tf.getBackend());

      // Load preprocessor first
      this.preprocessor = new ChordProgressionPreprocessor();
      await this.preprocessor.loadVocabularies(metadataPath);

      // Try to load the model
      try {
        console.log('Loading model from:', modelPath);
        this.model = await tf.loadLayersModel(modelPath);
        console.log('✅ Model loaded successfully');

        // Warm up with dummy prediction
        await this.warmUp();

        this.isLoaded = true;
        this.isLoading = false;
        return { success: true, mode: 'model' };
      } catch (modelError) {
        console.error('❌ Model loading error:', modelError);
        console.warn('⚠️ Model file not found, using DEMO mode');
        this.model = 'DEMO_MODE';
        this.isLoaded = true;
        this.isLoading = false;
        return { success: true, mode: 'demo' };
      }
    } catch (error) {
      console.error('❌ Error loading model:', error);
      this.error = error.message;
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * Warm up model with dummy prediction
   */
  async warmUp() {
    if (this.model === 'DEMO_MODE' || !this.model) return;

    console.log('Warming up model...');

    return tf.tidy(() => {
      const dummyInput = this.preprocessor.prepareInput([], 'pop', 'uplifting', 'C', 'major');

      const chordSequence = tf.tensor2d([dummyInput.chordSequence], [1, 12], 'int32');
      const genreId = tf.tensor2d([[dummyInput.genreId]], [1, 1], 'int32');
      const moodId = tf.tensor2d([[dummyInput.moodId]], [1, 1], 'int32');
      const keyId = tf.tensor2d([[dummyInput.keyId]], [1, 1], 'int32');
      const scaleTypeId = tf.tensor2d([[dummyInput.scaleTypeId]], [1, 1], 'int32');

      const prediction = this.model.predict([
        chordSequence,
        genreId,
        moodId,
        keyId,
        scaleTypeId,
      ]);

      prediction.dispose();
    });
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isLoaded && this.preprocessor !== null;
  }

  /**
   * Get current mode
   */
  getMode() {
    if (!this.isLoaded) return 'not_loaded';
    return this.model === 'DEMO_MODE' ? 'demo' : 'model';
  }

  /**
   * Generate chord progression
   * @param {string} genre - Genre selection
   * @param {string} mood - Mood selection
   * @param {string} key - Key selection
   * @param {string} scaleType - Scale type (major/minor)
   * @param {number} length - Progression length (4-12)
   * @param {number} temperature - Temperature for sampling (0.5-2.0)
   * @param {string} samplingStrategy - 'temperature', 'topk', or 'nucleus'
   * @param {object} samplingParams - Additional parameters for sampling
   * @returns {Promise<Array<string>>} - Generated chord progression
   */
  async generateProgression(
    genre,
    mood,
    key,
    scaleType,
    length = 4,
    temperature = 1.0,
    samplingStrategy = 'temperature',
    samplingParams = {}
  ) {
    if (!this.isReady()) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // Demo mode fallback
    if (this.model === 'DEMO_MODE') {
      return this.generateDemoProgression(genre, mood, key, scaleType, length, temperature, samplingStrategy);
    }

    // Validate inputs
    this.validateInputs(genre, mood, key, scaleType, length);

    const progression = [];
    let seedChords = [];

    try {
      // Autoregressive generation
      for (let i = 0; i < length; i++) {
        const nextChord = await this.generateNextChord(
          seedChords,
          genre,
          mood,
          key,
          scaleType,
          temperature,
          samplingStrategy,
          samplingParams
        );

        // Stop conditions
        if (!nextChord || nextChord === '<END>' || nextChord === '<PAD>' || nextChord === '<UNK>') {
          break;
        }

        // Validate chord
        if (this.isValidChord(nextChord)) {
          progression.push(nextChord);
          seedChords.push(nextChord);
        } else {
          console.warn(`Invalid chord generated: ${nextChord}, stopping generation`);
          break;
        }
      }

      // Validate full progression
      if (!this.isValidProgression(progression)) {
        console.warn('Generated invalid progression, applying fixes...');
        return this.fixProgression(progression, key, scaleType);
      }

      return progression;
    } catch (error) {
      console.error('Error during generation:', error);
      // Fallback to demo mode on error
      return this.generateDemoProgression(genre, mood, key, scaleType, length, temperature, samplingStrategy);
    }
  }

  /**
   * Generate next chord in sequence (autoregressive)
   */
  async generateNextChord(
    seedChords,
    genre,
    mood,
    key,
    scaleType,
    temperature = 1.0,
    samplingStrategy = 'temperature',
    samplingParams = {}
  ) {
    if (this.model === 'DEMO_MODE') {
      return null; // Handled by generateDemoProgression
    }

    return tf.tidy(() => {
      // Prepare input
      const input = this.preprocessor.prepareInput(seedChords, genre, mood, key, scaleType);

      // Create tensors
      const chordSequence = tf.tensor2d([input.chordSequence], [1, 12], 'int32');
      const genreId = tf.tensor2d([[input.genreId]], [1, 1], 'int32');
      const moodId = tf.tensor2d([[input.moodId]], [1, 1], 'int32');
      const keyId = tf.tensor2d([[input.keyId]], [1, 1], 'int32');
      const scaleTypeId = tf.tensor2d([[input.scaleTypeId]], [1, 1], 'int32');

      // Model prediction
      const prediction = this.model.predict([
        chordSequence,
        genreId,
        moodId,
        keyId,
        scaleTypeId,
      ]);

      // Get probabilities at current position
      const position = seedChords.length;
      if (position >= 12) {
        return null;
      }

      // Extract probability distribution
      const probs = prediction.slice([0, position, 0], [1, 1, -1]).squeeze();
      const probsArray = probs.arraySync();

      // Sample based on strategy
      let chordId;
      switch (samplingStrategy) {
        case 'topk':
          chordId = this.sampleTopK(probsArray, temperature, samplingParams.k || 10);
          break;
        case 'nucleus':
          chordId = this.sampleNucleus(probsArray, temperature, samplingParams.p || 0.9);
          break;
        case 'temperature':
        default:
          chordId = this.sampleTemperature(probsArray, temperature);
          break;
      }

      // Decode chord
      const chordName = this.preprocessor.decodeChord(chordId);
      return chordName;
    });
  }

  /**
   * Temperature sampling
   */
  sampleTemperature(probabilities, temperature = 1.0) {
    return this.preprocessor.sampleWithTemperature(probabilities, temperature);
  }

  /**
   * Top-K sampling
   * Sample from top K most likely tokens
   */
  sampleTopK(probabilities, temperature = 1.0, k = 10) {
    // Get top K indices
    const indexed = probabilities.map((p, i) => ({ prob: p, index: i }));
    indexed.sort((a, b) => b.prob - a.prob);

    const topK = indexed.slice(0, k);

    // Apply temperature
    const logits = topK.map(item => Math.log(item.prob + 1e-10) / temperature);
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const probs = expLogits.map(e => e / sumExp);

    // Sample
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (random < cumulative) {
        return topK[i].index;
      }
    }

    return topK[0].index;
  }

  /**
   * Nucleus (top-p) sampling
   * Sample from smallest set of tokens whose cumulative probability >= p
   */
  sampleNucleus(probabilities, temperature = 1.0, p = 0.9) {
    // Apply temperature first
    const logits = probabilities.map(prob => Math.log(prob + 1e-10) / temperature);
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const tempProbs = expLogits.map(e => e / sumExp);

    // Sort by probability
    const indexed = tempProbs.map((prob, i) => ({ prob, index: i }));
    indexed.sort((a, b) => b.prob - a.prob);

    // Find nucleus
    let cumulative = 0;
    let nucleusSize = 0;

    for (let i = 0; i < indexed.length; i++) {
      cumulative += indexed[i].prob;
      nucleusSize++;
      if (cumulative >= p) break;
    }

    const nucleus = indexed.slice(0, nucleusSize);

    // Renormalize
    const nucleusSum = nucleus.reduce((sum, item) => sum + item.prob, 0);
    const nucleusProbs = nucleus.map(item => item.prob / nucleusSum);

    // Sample
    const random = Math.random();
    cumulative = 0;

    for (let i = 0; i < nucleusProbs.length; i++) {
      cumulative += nucleusProbs[i];
      if (random < cumulative) {
        return nucleus[i].index;
      }
    }

    return nucleus[0].index;
  }

  /**
   * Generate variation of existing progression
   */
  async generateVariation(
    progression,
    genre,
    mood,
    key,
    scaleType,
    temperature = 1.2,
    samplingStrategy = 'temperature',
    keepFirst = 2
  ) {
    if (!this.isReady()) {
      throw new Error('Model not loaded');
    }

    if (this.model === 'DEMO_MODE') {
      return this.generateDemoVariation(progression, genre, mood, key, scaleType, temperature);
    }

    try {
      // Keep first N chords
      const seedChords = progression.slice(0, keepFirst);
      const length = progression.length;
      const variation = [...seedChords];

      // Generate remaining chords
      for (let i = keepFirst; i < length; i++) {
        const nextChord = await this.generateNextChord(
          variation,
          genre,
          mood,
          key,
          scaleType,
          temperature,
          samplingStrategy
        );

        if (!nextChord || nextChord === '<END>' || nextChord === '<PAD>') {
          break;
        }

        if (this.isValidChord(nextChord)) {
          variation.push(nextChord);
        } else {
          break;
        }
      }

      return variation;
    } catch (error) {
      console.error('Error generating variation:', error);
      return this.generateDemoVariation(progression, genre, mood, key, scaleType, temperature);
    }
  }

  /**
   * Validation methods
   */
  validateInputs(genre, mood, key, scaleType, length) {
    if (!this.preprocessor.getGenres().includes(genre)) {
      throw new Error(`Invalid genre: ${genre}`);
    }
    if (!this.preprocessor.getMoods().includes(mood)) {
      throw new Error(`Invalid mood: ${mood}`);
    }
    if (!this.preprocessor.getKeys().includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }
    if (!['major', 'minor'].includes(scaleType)) {
      throw new Error(`Invalid scale type: ${scaleType}`);
    }
    if (length < 1 || length > 12) {
      throw new Error(`Invalid length: ${length} (must be 1-12)`);
    }
  }

  isValidChord(chord) {
    // Check if chord is in vocabulary
    const chordId = this.preprocessor.encodeChord(chord);
    const unkId = this.preprocessor.chordVocab.chord_to_id['<UNK>'];
    return chordId !== unkId && chord !== '<PAD>' && chord !== '<START>' && chord !== '<END>';
  }

  isValidProgression(progression) {
    if (progression.length === 0) return false;

    // Check for consecutive identical chords (usually not musical)
    for (let i = 1; i < progression.length; i++) {
      if (progression[i] === progression[i - 1]) {
        console.warn(`Consecutive identical chords: ${progression[i]}`);
        return false;
      }
    }

    // Check all chords are valid
    for (const chord of progression) {
      if (!this.isValidChord(chord)) {
        return false;
      }
    }

    return true;
  }

  fixProgression(progression, key, scaleType) {
    // Remove consecutive duplicates
    const fixed = [];
    for (let i = 0; i < progression.length; i++) {
      if (i === 0 || progression[i] !== progression[i - 1]) {
        if (this.isValidChord(progression[i])) {
          fixed.push(progression[i]);
        }
      }
    }

    // If too short, fallback to demo
    if (fixed.length < 2) {
      return this.generateDemoProgression('pop', 'uplifting', key, scaleType, 4);
    }

    return fixed;
  }

  /**
   * Demo mode fallbacks
   */
  async generateDemoProgression(genre, mood, key, scaleType, length, temperature = 1.0, samplingStrategy = 'temperature') {
    // Import from existing demo generator
    const { MockChordGenerator } = await import('./chordGenerator');
    const mockGen = new MockChordGenerator();
    return mockGen.generateProgression(genre, mood, key, scaleType, length, temperature, samplingStrategy);
  }

  async generateDemoVariation(progression, genre, mood, key, scaleType, temperature = 1.2) {
    const { MockChordGenerator } = await import('./chordGenerator');
    const mockGen = new MockChordGenerator();
    return mockGen.generateVariation(progression, genre, mood, key, scaleType, temperature);
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.model && this.model !== 'DEMO_MODE') {
      this.model.dispose();
    }
    this.model = null;
    this.preprocessor = null;
    this.isLoaded = false;
  }
}

// Singleton instance
let modelServiceInstance = null;

export function getModelService() {
  if (!modelServiceInstance) {
    modelServiceInstance = new ModelService();
  }
  return modelServiceInstance;
}

export default ModelService;
