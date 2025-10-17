# TensorFlow.js Quick Start Guide

5-minute guide to convert your trained model and deploy to web.

## Prerequisites

```bash
# Python packages
pip install tensorflowjs

# Node.js packages (for testing)
npm install @tensorflow/tfjs-node
```

## Step 1: Convert Model (30 seconds)

```bash
cd model-training
python convert_pipeline.py --model models/chord_model_final.h5
```

This will:
- Convert Keras model to TF.js format
- Apply uint8 quantization (75% size reduction)
- Export all vocabularies and metadata
- Run automated tests
- Generate performance report

**Output:** `client/public/model/`

## Step 2: Verify Conversion (30 seconds)

```bash
# Check output files
ls client/public/model/

# Run Node.js tests
node test_tfjs_model.js
```

**Expected output:**
```
[OK] Model loaded successfully
[OK] Vocabularies loaded
Test: Pop - Uplifting - C Major
  Generated: C - G - Am - F
  Inference time: 45ms

Average inference time: 42.5ms
Throughput: 23.5 predictions/second
```

## Step 3: Use in Web App (2 minutes)

### Install TF.js

```bash
cd client
npm install @tensorflow/tfjs
```

### Load Model

```javascript
import * as tf from '@tensorflow/tfjs';
import { ChordProgressionPreprocessor } from './utils/modelUtils';

// Initialize
const model = await tf.loadLayersModel('/model/model.json');
const preprocessor = new ChordProgressionPreprocessor();
await preprocessor.loadVocabularies('/model/metadata');
```

### Generate Progressions

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
        const chordSequence = tf.tensor2d([input.chordSequence], [1, 12], 'int32');
        const genreId = tf.tensor2d([[input.genreId]], [1, 1], 'int32');
        const moodId = tf.tensor2d([[input.moodId]], [1, 1], 'int32');
        const keyId = tf.tensor2d([[input.keyId]], [1, 1], 'int32');
        const scaleTypeId = tf.tensor2d([[input.scaleTypeId]], [1, 1], 'int32');

        // Predict
        const prediction = model.predict([
            chordSequence, genreId, moodId, keyId, scaleTypeId
        ]);

        // Get probabilities
        const probs = await prediction.array();
        const nextProbs = probs[0][i];

        // Sample next chord
        const chordId = preprocessor.sampleWithTemperature(nextProbs, 1.0);
        const chord = preprocessor.decodeChord(chordId);

        // Stop if end or invalid
        if (chord === '<END>' || chord === '<PAD>') break;

        progression.push(chord);
        seedChords.push(chord);

        // Clean up
        chordSequence.dispose();
        genreId.dispose();
        moodId.dispose();
        keyId.dispose();
        scaleTypeId.dispose();
        prediction.dispose();
    }

    return progression;
}

// Usage
const progression = await generateProgression('pop', 'uplifting', 'C', 'major', 4);
console.log(progression); // ['C', 'G', 'Am', 'F']
```

## Step 4: Build UI (React Example)

```jsx
import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { ChordProgressionPreprocessor } from './utils/modelUtils';

function ChordGenerator() {
    const [model, setModel] = useState(null);
    const [preprocessor, setPreprocessor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progression, setProgression] = useState([]);

    // Load model on mount
    useEffect(() => {
        async function loadModel() {
            const m = await tf.loadLayersModel('/model/model.json');
            const p = new ChordProgressionPreprocessor();
            await p.loadVocabularies('/model/metadata');
            setModel(m);
            setPreprocessor(p);
            setLoading(false);
        }
        loadModel();
    }, []);

    // Generate progression
    async function generate() {
        const prog = await generateProgression('pop', 'uplifting', 'C', 'major', 4);
        setProgression(prog);
    }

    if (loading) return <div>Loading model...</div>;

    return (
        <div>
            <h1>ChordAI Generator</h1>
            <button onClick={generate}>Generate</button>
            <div>
                <h2>Generated Progression:</h2>
                <p>{progression.join(' - ')}</p>
            </div>
        </div>
    );
}
```

## Common Issues

### Model Not Loading

**Error:** `Cannot find model.json`

**Fix:**
```javascript
// Use absolute path
const model = await tf.loadLayersModel('http://localhost:3000/model/model.json');

// Or configure public path in React
// Place model files in public/model/
```

### High Memory Usage

**Error:** Memory leak warnings

**Fix:**
```javascript
// Always dispose tensors
tensor.dispose();

// Or use tf.tidy()
const result = tf.tidy(() => {
    // operations
    return finalTensor;
});
```

### Slow Inference

**Issue:** Predictions take >1 second

**Fix:**
```javascript
// Enable WebGL backend
await tf.setBackend('webgl');

// Warm up model
const dummy = model.predict([...dummyInputs]);
dummy.dispose();
```

## File Structure

```
/chordai
├── /client
│   ├── /public
│   │   └── /model              # TF.js model files
│   │       ├── model.json
│   │       ├── group1-shard*.bin
│   │       └── /metadata       # Vocabularies
│   └── /src
│       └── /utils
│           └── modelUtils.js   # Preprocessing utilities
└── /model-training
    ├── convert_to_tfjs.py      # Conversion script
    ├── convert_pipeline.py     # Automated pipeline
    ├── test_tfjs_model.js      # Node.js tests
    └── TFJS_CONVERSION_GUIDE.md
```

## Performance Tips

### 1. Preload Model

Load model on app initialization, not on first use:

```javascript
// App.js
useEffect(() => {
    loadModel(); // Load immediately
}, []);
```

### 2. Cache Vocabularies

Store vocabularies in memory:

```javascript
const vocabularies = {
    genres: preprocessor.getGenres(),
    moods: preprocessor.getMoods(),
    keys: preprocessor.getKeys()
};
```

### 3. Use WebGL

Enable GPU acceleration:

```javascript
await tf.setBackend('webgl');
```

### 4. Batch Predictions

Generate multiple progressions at once:

```javascript
const batchSize = 4;
const inputs = createBatchInputs(batchSize);
const predictions = model.predict(inputs);
```

## Next Steps

- Add audio playback with Tone.js
- Implement MIDI export
- Add progression history
- Enable user feedback
- Deploy to production

## Resources

**Documentation:**
- `TFJS_CONVERSION_GUIDE.md` - Comprehensive guide
- `client/src/utils/modelUtils.js` - Preprocessing API
- [TensorFlow.js Docs](https://www.tensorflow.org/js)

**Support:**
- Check model size: Should be <15 MB
- Check inference time: Should be <100ms on desktop
- Verify accuracy: Compare with Python model

---

**Ready to deploy!** Copy `client/public/model/` to your web server and you're good to go.
