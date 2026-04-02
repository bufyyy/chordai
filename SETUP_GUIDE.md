# ChordAI - Complete Setup Guide

Step-by-step guide to get ChordAI running from scratch.

## Quick Start (Already Have Trained Model)

If you already have a trained model, skip to step 4.

```bash
cd client
npm install
# Copy model files to public/model/
npm run dev
```

## Full Setup (From Scratch)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/chordai.git
cd chordai
```

### Step 2: Setup Python Environment

```bash
# Install Python dependencies
pip install -r requirements.txt
```

### Step 3: Generate Dataset (If Not Already Done)

```bash
cd data-collection

# Generate base dataset (30 patterns)
python generate_base_dataset.py

# Augment with transpositions (360 progressions)
python augment_transposition.py

# Add chord variations (1,080 total)
python augment_variations.py

cd ..
```

### Step 4: Preprocess Data

```bash
cd model-training

# Create train/val/test splits and vocabularies
python data_preprocessing.py

cd ..
```

### Step 5: Train Model

**Option A: Local Training (GPU recommended)**

```bash
cd model-training

# Train with default settings
python train_model_enhanced.py

# Or with custom settings
python train_model_enhanced.py --epochs 100 --batch-size 64

cd ..
```

**Option B: Google Colab (Free GPU)**

1. Upload `ChordAI_Training_Colab.ipynb` to Colab
2. Enable GPU: Runtime → Change runtime type → GPU
3. Upload dataset files or mount Google Drive
4. Run all cells
5. Download trained model

### Step 6: Convert Model to TensorFlow.js

```bash
cd model-training

# One-command conversion
python convert_pipeline.py --model models/chord_model_final.h5

# This will:
# - Convert model to TF.js
# - Export vocabularies
# - Run tests
# - Generate report

cd ..
```

### Step 7: Setup React Client

```bash
cd client

# Install dependencies
npm install

# Copy model files to public directory
# (Assuming conversion output is in ../model-training/output/tfjs/)
mkdir -p public/model
cp -r ../model-training/output/tfjs/* public/model/

# Or on Windows:
# xcopy /E /I ..\model-training\output\tfjs public\model
```

### Step 8: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## Detailed Setup Instructions

### Prerequisites

**Python Development:**
- Python 3.8 or higher
- pip package manager
- (Optional) CUDA 11.8+ for GPU training

**Web Development:**
- Node.js 16 or higher
- npm or yarn

### System Requirements

**For Training:**
- CPU: Any modern CPU (4+ cores recommended)
- RAM: 8GB minimum, 16GB recommended
- GPU: NVIDIA GPU with 4GB+ VRAM (optional but recommended)
- Disk: 2GB free space

**For Web App:**
- Any modern browser (Chrome, Firefox, Safari, Edge)
- 500MB free disk space
- Internet connection (first load only)

### Directory Structure After Setup

```
/chordai
├── /data-collection
│   ├── generate_base_dataset.py
│   ├── augment_transposition.py
│   └── augment_variations.py
├── /dataset
│   ├── progressions_base.json
│   ├── progressions_augmented.json
│   ├── chord_vocab.json
│   ├── metadata_vocab.json
│   ├── train.json
│   ├── val.json
│   └── test.json
├── /model-training
│   ├── data_preprocessing.py
│   ├── train_model_enhanced.py
│   ├── evaluate_comprehensive.py
│   ├── convert_to_tfjs.py
│   ├── convert_pipeline.py
│   ├── /models
│   │   └── chord_model_final.h5
│   └── /output
│       └── /tfjs  (TensorFlow.js model)
└── /client
    ├── package.json
    ├── /public
    │   └── /model  (Copy TF.js model here)
    ├── /src
    │   ├── /components
    │   ├── /services
    │   ├── /store
    │   └── /utils
    └── dist/  (production build)
```

---

## Troubleshooting

### Python Issues

**Import Error: No module named 'tensorflow'**
```bash
pip install tensorflow
```

**CUDA not found (GPU training)**
```bash
# Install CUDA 11.8 from NVIDIA website
# Install cuDNN 8.6
# Verify with:
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

**Out of memory during training**
```bash
# Reduce batch size
python train_model_enhanced.py --batch-size 16

# Or reduce model size
python train_model_enhanced.py --lstm-units 128
```

### Model Conversion Issues

**tensorflowjs not found**
```bash
pip install tensorflowjs
```

**Model size too large (>15MB)**
```bash
# Ensure quantization is enabled
python convert_to_tfjs.py --model models/chord_model_final.h5

# If still too large, consider model pruning
```

### React/Node Issues

**npm install fails**
```bash
# Clear cache and retry
npm cache clean --force
npm install
```

**Model not loading in browser**
- Check that model files are in `public/model/`
- Check browser console for errors
- Verify CORS settings
- Ensure all metadata files are present

**Vite port already in use**
```bash
# Use different port
npm run dev -- --port 3001
```

### Performance Issues

**Slow model loading**
- Model files should be <15MB total
- Check network speed
- Model is cached after first load

**Slow inference**
- Use WebGL backend (automatic in most browsers)
- Reduce progression length
- Check if GPU acceleration is enabled:
  ```javascript
  console.log(tf.getBackend()); // Should be 'webgl'
  ```

**Audio latency**
- Adjust buffer size in Tone.js
- Use lower tempo for development

---

## Production Deployment

### Build for Production

```bash
cd client
npm run build
```

Output in `dist/` directory.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Deploy to GitHub Pages

```bash
# Build with base path
npm run build -- --base=/chordai/

# Deploy
npm run deploy
```

---

## Development Workflow

### Making Changes

**1. Update Dataset**
```bash
cd data-collection
# Edit generate_base_dataset.py
python generate_base_dataset.py
python augment_transposition.py
python augment_variations.py
```

**2. Retrain Model**
```bash
cd model-training
python data_preprocessing.py
python train_model_enhanced.py
python evaluate_comprehensive.py
```

**3. Convert & Deploy**
```bash
python convert_pipeline.py --model models/chord_model_final.h5
cd ../client
cp -r ../model-training/output/tfjs/* public/model/
npm run dev
```

### Testing

**Test Model (Python)**
```bash
cd model-training
python evaluate_comprehensive.py --model models/chord_model_final.h5
```

**Test TF.js Conversion**
```bash
node test_tfjs_model.js
```

**Test React App**
```bash
cd client
npm run dev
# Open browser and test manually
```

---

## Resources

### Documentation

- **Project README**: `README.md`
- **Training Guide**: `model-training/TRAINING_GUIDE.md`
- **TF.js Conversion**: `model-training/TFJS_CONVERSION_GUIDE.md`
- **Client README**: `client/README.md`

### External Resources

- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [Tone.js Docs](https://tonejs.github.io/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Getting Help

- Check troubleshooting section above
- Read component documentation in `client/README.md`
- Review training guide in `model-training/TRAINING_GUIDE.md`
- Check browser console for errors
- Verify all dependencies are installed

---

**Happy coding!** 🎵🤖
