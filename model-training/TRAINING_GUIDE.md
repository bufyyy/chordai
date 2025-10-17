# Quick Training Guide

Complete guide to train the ChordAI model locally or on Google Colab.

## Option 1: Local Training (Recommended for GPU users)

### Prerequisites
- Python 3.8+
- TensorFlow 2.15+ with GPU support (optional but recommended)
- CUDA 11.8+ and cuDNN 8.6+ (for GPU)

### Step 1: Install Dependencies
```bash
cd model-training
pip install tensorflow matplotlib seaborn tqdm
```

### Step 2: Check GPU (Optional)
```bash
python -c "import tensorflow as tf; print('GPUs:', tf.config.list_physical_devices('GPU'))"
```

### Step 3: Train with Enhanced Script

**Quick Start (Default Settings):**
```bash
python train_model_enhanced.py
```

**Custom Configuration:**
```bash
python train_model_enhanced.py \
  --batch-size 64 \
  --epochs 100 \
  --lr 0.001 \
  --lstm-units 256 \
  --embedding-dim 128 \
  --dropout 0.3 \
  --generate-every 10
```

**Parameters:**
- `--batch-size`: Batch size (default: 32, increase to 64 for GPU)
- `--epochs`: Number of training epochs (default: 100)
- `--lr`: Learning rate (default: 0.001)
- `--lstm-units`: LSTM units (default: 256)
- `--embedding-dim`: Embedding dimension (default: 128)
- `--dropout`: Dropout rate (default: 0.3)
- `--generate-every`: Generate samples every N epochs (default: 10)

### Step 4: Monitor Training

**TensorBoard:**
```bash
tensorboard --logdir logs
```
Then open http://localhost:6006

**Training Output:**
- Models saved to `models/`
- Logs saved to `logs/`
- Training history plots in `output/`

### Step 5: Expected Training Time
- **CPU**: ~4-6 hours for 100 epochs
- **GPU (NVIDIA RTX 3060+)**: ~30-60 minutes for 100 epochs
- **Google Colab (T4 GPU)**: ~45-90 minutes for 100 epochs

---

## Option 2: Google Colab Training (Free GPU)

### Step 1: Open Colab Notebook
1. Upload `ChordAI_Training_Colab.ipynb` to Google Colab
2. Or open directly: [Open in Colab](https://colab.research.google.com/)

### Step 2: Enable GPU
- Runtime → Change runtime type → GPU (T4)

### Step 3: Upload Dataset
**Option A: Upload to Colab**
```python
from google.colab import files
uploaded = files.upload()
```

**Option B: Use Google Drive**
1. Upload dataset to Google Drive: `/MyDrive/ChordAI/dataset/`
2. Mount drive in notebook:
```python
from google.colab import drive
drive.mount('/content/drive')
```

### Step 4: Run All Cells
- Click Runtime → Run all
- Or run cells sequentially with Shift+Enter

### Step 5: Download Trained Model
```python
from google.colab import files
files.download('./models/chord_model_final.h5')
```

---

## Training Process Explained

### What Happens During Training

1. **GPU Configuration**
   - Enables GPU memory growth
   - Sets mixed precision (float16) for faster training
   - Falls back to CPU if GPU not available

2. **Data Loading**
   - Loads train/val/test splits (864/162/54 samples)
   - Creates data generators for efficient batch loading
   - Applies padding and encoding

3. **Model Building**
   - Constructs LSTM architecture
   - Compiles with Adam optimizer
   - Sets up embeddings for chords and metadata

4. **Training Loop**
   - Trains for specified epochs
   - Monitors validation loss
   - Applies callbacks:
     - **ModelCheckpoint**: Saves best model
     - **EarlyStopping**: Stops if no improvement (patience=10)
     - **ReduceLROnPlateau**: Reduces learning rate (patience=5)
     - **Sample Generation**: Every 10 epochs

5. **Evaluation**
   - Evaluates on test set
   - Saves training history
   - Plots loss/accuracy curves

---

## Training Output Files

After training, you'll find:

```
/model-training
├── /models
│   ├── chord_model_best_YYYYMMDD.h5        # Best checkpoint
│   ├── chord_model_final_YYYYMMDD.h5       # Final model
│   └── model_config_YYYYMMDD.json          # Model configuration
│
├── /logs
│   ├── training_YYYYMMDD.csv               # Training history CSV
│   └── tb_YYYYMMDD/                        # TensorBoard logs
│
└── /output
    ├── training_history_YYYYMMDD.json      # History JSON
    ├── training_history.png                # Loss/accuracy plots
    └── test_results_YYYYMMDD.json          # Test evaluation
```

---

## Monitoring Training Progress

### During Training

You'll see output like:
```
Epoch 1/100
Loss: 5.2341 - Accuracy: 0.0523
Val Loss: 5.1234 - Val Accuracy: 0.0612

Epoch 10/100 - Sample Generations:
  [1] Pop - Uplifting (C major)
      → C - G - Am - F
  [2] Rock - Energetic (E major)
      → E - B - C#m - A
  ...
```

### Metrics to Watch

**Loss:**
- Should decrease over time
- Train loss < val loss is normal
- If val loss increases while train loss decreases → overfitting

**Accuracy:**
- Should increase over time
- Target: 65-80% validation accuracy
- Higher accuracy on common progressions

**Learning Rate:**
- Starts at 0.001
- Reduces by 0.5 when val loss plateaus
- Check if it's reducing too early (increase patience)

---

## Expected Performance

### After 50 Epochs:
- Train Loss: 1.5-2.0
- Val Loss: 1.8-2.3
- Train Accuracy: 60-75%
- Val Accuracy: 55-70%

### After 100 Epochs:
- Train Loss: 1.0-1.5
- Val Loss: 1.5-2.0
- Train Accuracy: 70-85%
- Val Accuracy: 65-80%
- Test Accuracy: 65-80%

### Quality of Generated Progressions:
- Common progressions (I-V-vi-IV): High quality
- Genre-specific patterns: Good
- Rare/complex progressions: Variable
- Overall musicality: Good to very good

---

## Troubleshooting

### Out of Memory (OOM)

**Symptom**: "ResourceExhaustedError: OOM when allocating tensor"

**Solutions:**
1. Reduce batch size:
   ```bash
   python train_model_enhanced.py --batch-size 16
   ```

2. Reduce model size:
   ```bash
   python train_model_enhanced.py --lstm-units 128 --embedding-dim 64
   ```

3. Enable memory growth (already in enhanced script)

### Slow Training

**On CPU:**
- Expected: ~4-6 hours for 100 epochs
- Solution: Use Google Colab with GPU

**On GPU but still slow:**
- Check GPU usage: `nvidia-smi`
- Ensure mixed precision is enabled
- Increase batch size: `--batch-size 64`

### Model Not Improving

**Symptom**: Loss not decreasing after many epochs

**Solutions:**
1. Check data quality:
   ```bash
   python data_statistics.py
   ```

2. Increase model capacity:
   ```bash
   python train_model_enhanced.py --lstm-units 512 --embedding-dim 256
   ```

3. Adjust learning rate:
   ```bash
   python train_model_enhanced.py --lr 0.0005
   ```

4. Train longer:
   ```bash
   python train_model_enhanced.py --epochs 200
   ```

### Poor Generation Quality

**Symptom**: Generated progressions don't make musical sense

**Solutions:**
1. Train longer (model may not be converged)
2. Check test accuracy (should be >60%)
3. Adjust temperature during generation:
   ```python
   # More conservative
   generator.generate_progression(..., temperature=0.5)

   # More creative
   generator.generate_progression(..., temperature=1.2)
   ```

---

## Advanced Training Tips

### 1. Resume Training from Checkpoint

```python
model = keras.models.load_model('./models/chord_model_best.h5')

# Continue training
history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=50,  # Additional 50 epochs
    initial_epoch=50,  # Start from epoch 50
    callbacks=callbacks
)
```

### 2. Fine-tune on Specific Genre

```python
# Filter training data for specific genre
jazz_data = [d for d in train_data if d['genre'] == 'jazz']

# Create new generator
jazz_gen = ChordProgressionGenerator(jazz_data, batch_size=32)

# Fine-tune
model.fit(jazz_gen, epochs=20, ...)
```

### 3. Experiment with Architecture

Edit `model_architecture.py`:
- Add more LSTM layers
- Use GRU instead of LSTM
- Add attention mechanism
- Change embedding dimensions

### 4. Data Augmentation

Enable in data generator:
```python
train_gen = ChordProgressionGenerator(
    data=train_data,
    batch_size=32,
    augment=True  # Enable augmentation
)
```

---

## Post-Training

### 1. Evaluate Model
```bash
python evaluate_model.py --model models/chord_model_final.h5 --evaluate
```

### 2. Generate Samples
```bash
python evaluate_model.py --model models/chord_model_final.h5 --generate --num-samples 20
```

### 3. Export for Production

**SavedModel format (recommended):**
```python
model.save('./models/chord_model_saved', save_format='tf')
```

**TensorFlow Lite (for mobile):**
```python
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

with open('./models/chord_model.tflite', 'wb') as f:
    f.write(tflite_model)
```

---

## Next Steps

After successful training:

1. **Build API**: Create Flask/FastAPI backend
2. **Deploy**: Containerize with Docker, deploy to cloud
3. **Frontend**: Build React app for user interaction
4. **Improve**: Collect user feedback, retrain with more data

---

## Questions?

Check:
- `MODEL_TRAINING_GUIDE.md` - Detailed architecture guide
- `README.md` - Project overview
- `PROJECT_STATUS.md` - Current status

---

**Happy Training!** 🎵🤖
