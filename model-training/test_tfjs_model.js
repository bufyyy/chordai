/**
 * TensorFlow.js Model Test Script
 *
 * Tests the converted TF.js model:
 * - Loads model and vocabularies
 * - Runs inference on test cases
 * - Compares with Python model outputs (if available)
 * - Measures inference performance
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const path = require('path');

class TFJSModelTester {
  constructor(modelPath = '../client/public/model') {
    this.modelPath = modelPath;
    this.model = null;
    this.chordVocab = null;
    this.genreMapping = null;
    this.moodMapping = null;
    this.keyMapping = null;
    this.scaleTypeMapping = null;
    this.modelConfig = null;
  }

  /**
   * Load model and all vocabularies
   */
  async loadModel() {
    console.log('\n[1/2] Loading TensorFlow.js model...');

    try {
      // Load model
      const modelJsonPath = `file://${path.resolve(this.modelPath, 'model.json')}`;
      this.model = await tf.loadLayersModel(modelJsonPath);

      console.log('  [OK] Model loaded successfully');
      console.log(`  Input shapes: ${this.model.inputs.map(i => i.shape).join(', ')}`);
      console.log(`  Output shape: ${this.model.outputs[0].shape}`);

      // Load vocabularies
      const metadataPath = path.join(this.modelPath, 'metadata');

      const [chordVocab, genreMapping, moodMapping, keyMapping, scaleTypeMapping, modelConfig] = await Promise.all([
        fs.readFile(path.join(metadataPath, 'chord_vocab.json'), 'utf-8').then(JSON.parse),
        fs.readFile(path.join(metadataPath, 'genre_mapping.json'), 'utf-8').then(JSON.parse),
        fs.readFile(path.join(metadataPath, 'mood_mapping.json'), 'utf-8').then(JSON.parse),
        fs.readFile(path.join(metadataPath, 'key_mapping.json'), 'utf-8').then(JSON.parse),
        fs.readFile(path.join(metadataPath, 'scale_type_mapping.json'), 'utf-8').then(JSON.parse),
        fs.readFile(path.join(metadataPath, 'model_config.json'), 'utf-8').then(JSON.parse)
      ]);

      this.chordVocab = chordVocab;
      this.genreMapping = genreMapping;
      this.moodMapping = moodMapping;
      this.keyMapping = keyMapping;
      this.scaleTypeMapping = scaleTypeMapping;
      this.modelConfig = modelConfig;

      console.log('  [OK] Vocabularies loaded');
      console.log(`    Chord vocab size: ${chordVocab.vocab_size}`);
      console.log(`    Genres: ${Object.keys(genreMapping).length}`);
      console.log(`    Moods: ${Object.keys(moodMapping).length}`);

      return true;
    } catch (error) {
      console.error('  [ERROR] Failed to load model:', error.message);
      throw error;
    }
  }

  /**
   * Prepare input tensors
   */
  prepareInput(seedChords, genre, mood, key, scaleType) {
    // Encode chords
    let chordIds;
    if (seedChords && seedChords.length > 0) {
      chordIds = seedChords.map(chord => {
        const id = this.chordVocab.chord_to_id[chord];
        return id !== undefined ? id : this.chordVocab.chord_to_id['<UNK>'];
      });
    } else {
      // Start with START token
      chordIds = [this.chordVocab.chord_to_id['<START>']];
    }

    // Pad sequence to max length (12)
    const maxLength = this.modelConfig.max_sequence_length;
    const padId = this.chordVocab.chord_to_id['<PAD>'];

    while (chordIds.length < maxLength) {
      chordIds.push(padId);
    }
    if (chordIds.length > maxLength) {
      chordIds = chordIds.slice(0, maxLength);
    }

    // Get metadata IDs
    const genreId = this.genreMapping[genre] !== undefined ? this.genreMapping[genre] : 0;
    const moodId = this.moodMapping[mood] !== undefined ? this.moodMapping[mood] : 0;
    const keyId = this.keyMapping[key] !== undefined ? this.keyMapping[key] : 0;
    const scaleTypeId = this.scaleTypeMapping[scaleType] !== undefined ? this.scaleTypeMapping[scaleType] : 0;

    // Create tensors
    const chordSequence = tf.tensor2d([chordIds], [1, maxLength], 'int32');
    const genreTensor = tf.tensor2d([[genreId]], [1, 1], 'int32');
    const moodTensor = tf.tensor2d([[moodId]], [1, 1], 'int32');
    const keyTensor = tf.tensor2d([[keyId]], [1, 1], 'int32');
    const scaleTypeTensor = tf.tensor2d([[scaleTypeId]], [1, 1], 'int32');

    return {
      chordSequence,
      genre: genreTensor,
      mood: moodTensor,
      key: keyTensor,
      scaleType: scaleTypeTensor
    };
  }

  /**
   * Run inference
   */
  async predict(seedChords, genre, mood, key, scaleType) {
    const inputs = this.prepareInput(seedChords, genre, mood, key, scaleType);

    // Run prediction
    const prediction = this.model.predict([
      inputs.chordSequence,
      inputs.genre,
      inputs.mood,
      inputs.key,
      inputs.scaleType
    ]);

    // Get probabilities
    const probs = await prediction.array();

    // Clean up tensors
    inputs.chordSequence.dispose();
    inputs.genre.dispose();
    inputs.mood.dispose();
    inputs.key.dispose();
    inputs.scaleType.dispose();
    prediction.dispose();

    return probs[0]; // Shape: [12, 279]
  }

  /**
   * Generate next chord
   */
  async generateNextChord(seedChords, genre, mood, key, scaleType, temperature = 1.0) {
    const probs = await this.predict(seedChords, genre, mood, key, scaleType);

    // Get probabilities for next position
    const position = seedChords.length;
    if (position >= probs.length) {
      return null; // Sequence full
    }

    const nextProbs = probs[position];

    // Sample with temperature
    const chordId = this.sampleWithTemperature(nextProbs, temperature);
    const chordName = this.chordVocab.id_to_chord[chordId.toString()];

    return chordName;
  }

  /**
   * Sample from probability distribution with temperature
   */
  sampleWithTemperature(probabilities, temperature = 1.0) {
    // Apply temperature
    const scaledLogits = probabilities.map(p => Math.log(p + 1e-10) / temperature);

    // Softmax
    const maxLogit = Math.max(...scaledLogits);
    const expLogits = scaledLogits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const probs = expLogits.map(e => e / sumExp);

    // Sample
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (random < cumulative) {
        return i;
      }
    }

    return probs.length - 1;
  }

  /**
   * Generate complete progression
   */
  async generateProgression(genre, mood, key, scaleType, length = 4, temperature = 1.0) {
    const progression = [];
    let seedChords = [];

    for (let i = 0; i < length; i++) {
      const nextChord = await this.generateNextChord(seedChords, genre, mood, key, scaleType, temperature);

      if (!nextChord || nextChord === '<END>' || nextChord === '<PAD>' || nextChord === '<UNK>') {
        break;
      }

      progression.push(nextChord);
      seedChords.push(nextChord);
    }

    return progression;
  }

  /**
   * Test model with predefined test cases
   */
  async runTests() {
    console.log('\n[2/2] Running inference tests...\n');

    const testCases = [
      {
        name: 'Pop - Uplifting - C Major',
        genre: 'pop',
        mood: 'uplifting',
        key: 'C',
        scaleType: 'major',
        seedChords: ['C', 'G']
      },
      {
        name: 'Rock - Energetic - E Major',
        genre: 'rock',
        mood: 'energetic',
        key: 'E',
        scaleType: 'major',
        seedChords: ['E', 'B']
      },
      {
        name: 'Jazz - Sophisticated - Dm',
        genre: 'jazz',
        mood: 'sophisticated',
        key: 'D',
        scaleType: 'minor',
        seedChords: ['Dm7', 'G7']
      },
      {
        name: 'Blues - Melancholic - A Major',
        genre: 'blues',
        mood: 'melancholic',
        key: 'A',
        scaleType: 'major',
        seedChords: ['A7']
      },
      {
        name: 'EDM - Energetic - Gm',
        genre: 'edm',
        mood: 'energetic',
        key: 'G',
        scaleType: 'minor',
        seedChords: []
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      console.log(`Test: ${testCase.name}`);
      console.log(`  Genre: ${testCase.genre}, Mood: ${testCase.mood}, Key: ${testCase.key} ${testCase.scaleType}`);
      console.log(`  Seed: ${testCase.seedChords.length > 0 ? testCase.seedChords.join(' - ') : '[START]'}`);

      // Measure inference time
      const startTime = Date.now();

      const progression = await this.generateProgression(
        testCase.genre,
        testCase.mood,
        testCase.key,
        testCase.scaleType,
        4,
        1.0
      );

      const inferenceTime = Date.now() - startTime;

      console.log(`  Generated: ${progression.join(' - ')}`);
      console.log(`  Inference time: ${inferenceTime}ms\n`);

      results.push({
        ...testCase,
        generated: progression,
        inferenceTime
      });
    }

    return results;
  }

  /**
   * Performance benchmark
   */
  async benchmark(numIterations = 100) {
    console.log(`\nRunning performance benchmark (${numIterations} iterations)...\n`);

    const times = [];

    for (let i = 0; i < numIterations; i++) {
      const startTime = Date.now();

      await this.predict(['C', 'G', 'Am', 'F'], 'pop', 'uplifting', 'C', 'major');

      const time = Date.now() - startTime;
      times.push(time);

      if ((i + 1) % 20 === 0) {
        console.log(`  Progress: ${i + 1}/${numIterations}`);
      }
    }

    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const medianTime = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

    console.log('\nPerformance Statistics:');
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Median:  ${medianTime.toFixed(2)}ms`);
    console.log(`  Min:     ${minTime.toFixed(2)}ms`);
    console.log(`  Max:     ${maxTime.toFixed(2)}ms`);
    console.log(`  Throughput: ${(1000 / avgTime).toFixed(2)} predictions/second`);

    return {
      avgTime,
      medianTime,
      minTime,
      maxTime,
      throughput: 1000 / avgTime
    };
  }

  /**
   * Compare with Python model output (if available)
   */
  async compareWithPython(pythonOutputPath) {
    try {
      const pythonOutput = JSON.parse(await fs.readFile(pythonOutputPath, 'utf-8'));

      console.log('\n[COMPARISON] Comparing with Python model output...\n');

      for (const testCase of pythonOutput.test_cases) {
        console.log(`Test: ${testCase.name}`);

        const jsProgression = await this.generateProgression(
          testCase.genre,
          testCase.mood,
          testCase.key,
          testCase.scaleType,
          testCase.expected_length || 4,
          testCase.temperature || 1.0
        );

        console.log(`  Python:     ${testCase.generated.join(' - ')}`);
        console.log(`  JavaScript: ${jsProgression.join(' - ')}`);

        // Check if similar (won't be identical due to randomness)
        const pythonSet = new Set(testCase.generated);
        const jsSet = new Set(jsProgression);
        const intersection = new Set([...pythonSet].filter(x => jsSet.has(x)));
        const similarity = intersection.size / Math.max(pythonSet.size, jsSet.size);

        console.log(`  Similarity: ${(similarity * 100).toFixed(1)}%\n`);
      }
    } catch (error) {
      console.log(`\n[INFO] Python comparison file not found: ${pythonOutputPath}`);
      console.log('Skipping comparison test.\n');
    }
  }

  /**
   * Generate test report
   */
  async generateReport(results, benchmarkResults) {
    const report = {
      timestamp: new Date().toISOString(),
      model_path: this.modelPath,
      model_info: {
        vocab_size: this.chordVocab.vocab_size,
        max_sequence_length: this.modelConfig.max_sequence_length,
        genres: Object.keys(this.genreMapping).length,
        moods: Object.keys(this.moodMapping).length
      },
      test_results: results,
      performance: benchmarkResults
    };

    const reportPath = path.join(this.modelPath, 'tfjs_test_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n[OK] Test report saved to: ${reportPath}`);

    return report;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('TENSORFLOW.JS MODEL TEST');
  console.log('='.repeat(70));

  const tester = new TFJSModelTester();

  try {
    // Load model
    await tester.loadModel();

    // Run tests
    const testResults = await tester.runTests();

    // Benchmark
    const benchmarkResults = await tester.benchmark(50);

    // Compare with Python (if available)
    await tester.compareWithPython('../model-training/output/python_test_output.json');

    // Generate report
    await tester.generateReport(testResults, benchmarkResults);

    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n[OK] All tests completed successfully!`);
    console.log(`\nTest cases: ${testResults.length}`);
    console.log(`Average inference time: ${benchmarkResults.avgTime.toFixed(2)}ms`);
    console.log(`Throughput: ${benchmarkResults.throughput.toFixed(2)} predictions/second`);
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('\n[ERROR] Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main();
}

module.exports = { TFJSModelTester };
