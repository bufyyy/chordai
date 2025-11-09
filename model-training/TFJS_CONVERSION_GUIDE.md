# TensorFlow.js Conversion Guide

Complete guide for converting the ChordAI Keras model to TensorFlow.js for web deployment.

## Overview

This guide covers:
1. Converting Keras model to TF.js format
2. Exporting vocabularies and metadata
3. Testing the converted model
4. Integrating into web application

## Quick Start

### One-Command Conversion

```bash
cd model-training
python convert_pipeline.py --model models/chord_model_final.h5
```

This automated pipeline will:
- Convert model to TF.js with quantization
- Export all vocabularies and metadata
- Run Node.js tests
- Generate performance report

---

## Manual Conversion

### Step 1: Install Dependencies

**Python:**
```bash
pip install tensorflowjs
```

**Node.js (for testing):**
```bash
npm install @tensorflow/tfjs-node
```

### Step 2: Convert Model

```bash
python convert_to_tfjs.py \
  --model models/chord_model_final.h5 \
  --output ../client/public/model \
  --data-dir ../dataset
```

**Options:**
- `--model`: Path to Keras model (.h5 file)
- `--output`: Output directory for TF.js model
- `--data-dir`: Dataset directory (for vocabularies)
- `--no-quantize`: Disable quantization (not recommended)

**Output Files:**
```
/client/public/model
├── model.json                 # Model architecture
├── group1-shard*.bin          # Model weights (quantized)
├── /metadata
│   ├── chord_vocab.json       # Chord vocabulary
│   ├── genre_mapping.json     # Genre IDs
│   ├── mood_mapping.json      # Mood IDs
│   ├── key_mapping.json       # Key IDs
│   ├── scale_type_mapping.json
│   └── model_config.json      # Model specifications
├── README.md
└── conversion_report.json
```

### Step 3: Test Conversion

```bash
node test_tfjs_model.js
```

**Test Output:**
```
[1/2] Loading TensorFlow.js model...
  [OK] Model loaded successfully
  [OK] Vocabularies loaded

[2/2] Running inference tests...
  Test: Pop - Uplifting - C Major
    Generated: C - G - Am - F
    Inference time: 45ms

Performance Statistics:
  Average: 42.5ms
  Throughput: 23.5 predictions/second
```

---

## Understanding the Conversion

### Quantization

The conversion uses **uint8 quantization** to reduce model size:

**Before quantization:**
- float32 weights: 4 bytes per weight
- ~2M parameters × 4 bytes = ~8 MB

**After quantization:**
- uint8 weights: 1 byte per weight
- ~2M parameters × 1 byte = ~2 MB
- **Size reduction: 75%**

**Trade-offs:**
- Pros: Smaller size, faster download, similar accuracy
- Cons: Slight accuracy loss (~1-2%)

### Model Architecture Mapping

**Keras Model:**
```python
model = keras.Model(
    inputs=[chord_seq, genre, mood, key, scale],
    outputs=output
)
```

**TF.js Model:**
```javascript
const prediction = model.predict([
    chordSequence,  // [1, 12] int32
    genreId,        // [1, 1] int32
    moodId,         // [1, 1] int32
    keyId,          // [1, 1] int32
    scaleTypeId     // [1, 1] int32
]);
// Returns: [1, 12, 279] float32
```

### Vocabulary Files

**chord_vocab.json:**
```json
{
  "vocab_size": 279,
  "chord_to_id": {
    "<PAD>": 0,
    "<START>": 1,
    "<END>": 2,
    "<UNK>": 3,
    "C": 4,
    "G": 5,
    ...
  },
  "id_to_chord": {
    "0": "<PAD>",
    "1": "<START>",
    "4": "C",
    "5": "G",
    ...
  }
}
```

---

## Using in Web Application

### 1. Load Model and Vocabularies

```javascript
import * as tf from '@tensorflow/tfjs';
import { ChordProgressionPreprocessor } from './utils/modelUtils';

// Load model
const model = await tf.loadLayersModel('/model/model.json');

// Load preprocessor
const preprocessor = new ChordProgressionPreprocessor();
await preprocessor.loadVocabularies('/model/metadata');
```

### 2. Prepare Input

```javascript
// User selections
const genre = 'pop';
const mood = 'uplifting';
const key = 'C';
const scaleType = 'major';
const seedChords = ['C', 'G'];

// Prepare model input
const input = preprocessor.prepareInput(
    seedChords, genre, mood, key, scaleType
);

// Convert to tensors
const chordSequence = tf.tensor2d([input.chordSequence], [1, 12], 'int32');
const genreId = tf.tensor2d([[input.genreId]], [1, 1], 'int32');
const moodId = tf.tensor2d([[input.moodId]], [1, 1], 'int32');
const keyId = tf.tensor2d([[input.keyId]], [1, 1], 'int32');
const scaleTypeId = tf.tensor2d([[input.scaleTypeId]], [1, 1], 'int32');
```

### 3. Run Inference

```javascript
// Predict
const prediction = model.predict([
    chordSequence,
    genreId,
    moodId,
    keyId,
    scaleTypeId
]);

// Get probabilities (shape: [1, 12, 279])
const probs = await prediction.array();

// Sample next chord
const nextPosition = seedChords.length;
const nextChordProbs = probs[0][nextPosition];
const nextChordId = preprocessor.sampleWithTemperature(nextChordProbs, 1.0);
const nextChord = preprocessor.decodeChord(nextChordId);

console.log('Next chord:', nextChord);
```

### 4. Generate Complete Progression

```javascript
async function generateProgression(genre, mood, key, scaleType, length = 4) {
    const progression = [];
    let seedChords = [];

    for (let i = 0; i < length; i++) {
        // Prepare input
        const input = preprocessor.prepareInput(
            seedChords, genre, mood, key, scaleType
        );

        // Create tensors
        const tensors = createTensors(input);

        // Predict
        const prediction = model.predict(tensors);
        const probs = await prediction.array();

        // Sample next chord
        const nextChordId = preprocessor.sampleWithTemperature(
            probs[0][i], 1.0
        );
        const nextChord = preprocessor.decodeChord(nextChordId);

        // Stop if end token or invalid
        if (nextChord === '<END>' || nextChord === '<PAD>') break;

        progression.push(nextChord);
        seedChords.push(nextChord);

        // Clean up
        disposeTensors(tensors);
        prediction.dispose();
    }

    return progression;
}

// Usage
const progression = await generateProgression('pop', 'uplifting', 'C', 'major', 4);
console.log('Generated:', progression.join(' - '));
// Output: C - G - Am - F
```

---

## Performance Optimization

### 1. Model Loading

**Preload model on app initialization:**
```javascript
// App.js
useEffect(() => {
    async function loadModel() {
        setLoading(true);
        const model = await tf.loadLayersModel('/model/model.json');
        const preprocessor = new ChordProgressionPreprocessor();
        await preprocessor.loadVocabularies('/model/metadata');
        setModel(model);
        setPreprocessor(preprocessor);
        setLoading(false);
    }
    loadModel();
}, []);
```

### 2. Tensor Memory Management

**Always dispose tensors:**
```javascript
const tensor = tf.tensor2d([[1, 2, 3]]);
// ... use tensor
tensor.dispose(); // Free memory
```

**Use tf.tidy() for automatic cleanup:**
```javascript
const result = tf.tidy(() => {
    const a = tf.tensor2d([[1, 2]]);
    const b = tf.tensor2d([[3, 4]]);
    return a.add(b); // Only result is kept
});
```

### 3. Backend Selection

**GPU acceleration (WebGL):**
```javascript
import '@tensorflow/tfjs-backend-webgl';
await tf.setBackend('webgl');
```

**CPU fallback:**
```javascript
import '@tensorflow/tfjs-backend-cpu';
await tf.setBackend('cpu');
```

### 4. Batching

**Generate multiple progressions:**
```javascript
const batchSize = 4;
const chordSequences = tf.tensor2d(
    [input1.chordSequence, input2.chordSequence, ...],
    [batchSize, 12],
    'int32'
);

const predictions = model.predict([chordSequences, ...]);
// Shape: [4, 12, 279]
```

---

## Troubleshooting

### Model Not Loading

**Issue:** `Error: Cannot find model.json`

**Solution:**
- Verify file path: `/model/model.json`
- Check CORS settings for local development
- Use `file://` protocol for Node.js

### High Memory Usage

**Issue:** "Memory leak detected"

**Solution:**
```javascript
// Dispose tensors after use
prediction.dispose();

// Monitor memory
console.log(tf.memory());

// Use tf.tidy()
const result = tf.tidy(() => {
    // operations
});
```

### Slow Inference

**Issue:** Prediction takes >1 second

**Solutions:**
1. Enable WebGL backend
2. Warm up model:
   ```javascript
   // Run dummy prediction
   const dummy = model.predict([...dummyInputs]);
   dummy.dispose();
   ```
3. Use batching for multiple predictions

### Different Results from Python

**Issue:** JavaScript model produces different outputs

**Explanation:**
- Temperature sampling is inherently random
- Use same random seed for comparison
- Check vocabulary mappings

**Verification:**
```javascript
// Set deterministic seed (for testing only)
tf.util.seedrandom(42);
```

---

## Performance Benchmarks

### Expected Performance

**Model Size:**
- Original Keras: 8-12 MB
- TF.js (quantized): 2-4 MB
- **Target: <15 MB ✓**

**Inference Time (per prediction):**
- Desktop (GPU): 20-40ms
- Desktop (CPU): 50-100ms
- Mobile (iOS): 100-200ms
- Mobile (Android): 150-300ms

**Throughput:**
- Desktop: 20-50 predictions/second
- Mobile: 3-10 predictions/second

### Comparison: Python vs JavaScript

| Metric | Python (CPU) | Python (GPU) | TF.js (WebGL) |
|--------|--------------|--------------|---------------|
| Model load | 500ms | 500ms | 1-2s |
| First prediction | 200ms | 50ms | 200ms |
| Avg prediction | 50ms | 10ms | 40ms |
| Memory | ~500MB | ~2GB | ~200MB |

---

## Production Deployment

### CDN Hosting

**Host model files on CDN:**
```javascript
const modelUrl = 'https://cdn.yourapp.com/models/v1/model.json';
const model = await tf.loadLayersModel(modelUrl);
```

**Benefits:**
- Faster loading (CDN edge servers)
- Cached across sessions
- Version control

### Service Worker Caching

**Cache model for offline use:**
```javascript
// service-worker.js
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('tfjs-models-v1').then((cache) => {
            return cache.addAll([
                '/model/model.json',
                '/model/group1-shard1of1.bin',
                '/model/metadata/chord_vocab.json',
                // ... other files
            ]);
        })
    );
});
```

### Progressive Loading

**Show UI before model loads:**
```javascript
function App() {
    const [modelLoaded, setModelLoaded] = useState(false);

    return (
        <div>
            {!modelLoaded ? (
                <LoadingScreen />
            ) : (
                <ChordGenerator model={model} />
            )}
        </div>
    );
}
```

---

## Next Steps

After successful conversion:

1. **Integrate into React app**
   - Create ChordGenerator component
   - Add UI for genre/mood/key selection
   - Display generated progressions

2. **Add audio playback**
   - Use Tone.js for chord synthesis
   - Implement play/pause controls
   - Support different instruments

3. **Enable MIDI export**
   - Convert progression to MIDI format
   - Allow download as .mid file

4. **Deploy to production**
   - Host model on CDN
   - Implement service worker caching
   - Add analytics

---

## Resources

**Documentation:**
- [TensorFlow.js Guide](https://www.tensorflow.org/js/guide)
- [Model Conversion](https://www.tensorflow.org/js/guide/conversion)
- [Performance Best Practices](https://www.tensorflow.org/js/guide/platform_environment)

**Example Apps:**
- [ChordAI Demo](https://github.com/yourrepo/chordai)
- [TF.js Examples](https://github.com/tensorflow/tfjs-examples)

---

**Happy Deploying!** 🎵🚀
