# Model Training Guide

Complete guide for training the LSTM chord progression model.

## Architecture Overview

### Model Structure

```
Input Layer (Conditioning):
  - Genre ID (categorical)
  - Mood ID (categorical)
  - Key ID (categorical)
  - Scale Type ID (categorical)

Input Layer (Sequence):
  - Chord Sequence [batch, 12]

Embedding Layers:
  - Chord Embedding: 279 -> 128D (with masking)
  - Genre Embedding: 8 -> 16D
  - Mood Embedding: 27 -> 16D
  - Key Embedding: 24 -> 12D
  - Scale Embedding: 2 -> 4D

Conditioning Projection:
  - Concatenate metadata embeddings
  - Dense(128, relu)
  - RepeatVector(12) to match sequence length

Combined Input:
  - Concatenate chord embeddings + conditioning
  - Shape: [batch, 12, 256]

LSTM Layers:
  - LSTM(256 units, return_sequences=True)
  - Dropout(0.3)
  - LSTM(256 units, return_sequences=True)
  - Dropout(0.3)

Output Layer:
  - TimeDistributed(Dense(279, softmax))
  - Shape: [batch, 12, 279]
```

### Model Parameters

**Default Configuration:**
- Embedding dimension: 128
- LSTM units: 256 (2 layers)
- Dropout rate: 0.3
- Batch size: 32
- Learning rate: 0.001
- Optimizer: Adam
- Loss: sparse_categorical_crossentropy
- Metric: accuracy

**Total Parameters: ~2-3M** (depending on vocabulary size)

## Quick Start

### 1. Test Model Architecture

```bash
cd model-training
python model_architecture.py
```

This will:
- Load vocabulary information
- Build the model
- Print model summary
- Save architecture diagram

### 2. Test Data Generator

```bash
python data_generator.py
```

This will:
- Load training data
- Create a test batch
- Display batch shapes and sample data

### 3. Train Model

**Basic Training:**
```bash
python train_model.py
```

**Custom Configuration:**
```bash
python train_model.py \
  --batch-size 64 \
  --epochs 100 \
  --lr 0.0005 \
  --lstm-units 512 \
  --embedding-dim 256 \
  --dropout 0.4
```

### 4. Evaluate and Generate

**Evaluate on test set:**
```bash
python evaluate_model.py --model ./output/chord_model_final.h5 --evaluate
```

**Generate sample progressions:**
```bash
python evaluate_model.py --model ./output/chord_model_final.h5 --generate --num-samples 10
```

## Training Process

### Step 1: Data Loading
- Loads preprocessed train/val/test data (864/162/54 samples)
- Creates custom Keras generators for efficient batch loading

### Step 2: Model Building
- Constructs LSTM model with conditioning inputs
- Compiles with Adam optimizer and sparse categorical crossentropy loss

### Step 3: Training with Callbacks
- **ModelCheckpoint**: Saves best model based on validation loss
- **EarlyStopping**: Stops training if validation loss doesn't improve (patience=10)
- **ReduceLROnPlateau**: Reduces learning rate when validation loss plateaus (patience=5)
- **TensorBoard**: Logs training metrics for visualization
- **CSVLogger**: Saves training history to CSV

### Step 4: Evaluation
- Evaluates final model on test set
- Saves test results

## Output Files

After training, you'll find these files in `model-training/`:

```
/model-training
├── /output
│   ├── chord_model_final.h5              # Final trained model
│   ├── training_config.json              # Training configuration
│   ├── training_history.json             # Loss/accuracy per epoch
│   ├── test_results.json                 # Test set evaluation
│   └── generated_samples.json            # Sample generations
│
├── /checkpoints
│   └── chord_model_best_YYYYMMDD.h5      # Best checkpoint
│
└── /logs
    └── tb_YYYYMMDD/                      # TensorBoard logs
```

## Model Input/Output Format

### Training Inputs

```python
{
    'chord_sequence_input': [batch_size, 12],      # Padded chord IDs
    'genre_input': [batch_size, 1],                # Genre ID
    'mood_input': [batch_size, 1],                 # Mood ID
    'key_input': [batch_size, 1],                  # Key ID
    'scale_type_input': [batch_size, 1]            # Scale type ID
}
```

### Training Targets

```python
targets: [batch_size, 12]  # Next chord IDs (shifted by 1)
```

### Model Output

```python
output: [batch_size, 12, 279]  # Probability distribution over vocabulary
```

## Generation Process

The model generates progressions autoregressively:

1. **Start with conditioning**: Genre, mood, key, scale type
2. **Optional seed**: Provide starting chords (e.g., ["C", "Am"])
3. **Iterative prediction**:
   - Feed current sequence + conditioning to model
   - Sample next chord from output distribution
   - Append to sequence
   - Repeat until desired length or END token

**Temperature Sampling:**
- `temperature = 0.5`: More conservative (picks likely chords)
- `temperature = 1.0`: Balanced
- `temperature = 1.5`: More creative/random

## Monitoring Training

### TensorBoard

View training progress in real-time:

```bash
tensorboard --logdir model-training/logs
```

Then open http://localhost:6006 in your browser.

**Metrics to Monitor:**
- `loss`: Training loss (should decrease)
- `val_loss`: Validation loss (should decrease, watch for overfitting)
- `accuracy`: Training accuracy
- `val_accuracy`: Validation accuracy
- `lr`: Learning rate (decreases with ReduceLROnPlateau)

### CSV Logs

Training logs are also saved to CSV for easy analysis:

```bash
# View training history
cat output/training_log_*.csv
```

## Expected Performance

**With default configuration (~50 epochs):**

- Training accuracy: 70-85%
- Validation accuracy: 65-80%
- Test accuracy: 65-80%

**Notes:**
- Higher accuracy on common progressions (I-V-vi-IV, ii-V-I)
- Lower accuracy on rare/complex progressions
- Genre-specific performance varies

## Troubleshooting

### Out of Memory (OOM)

Reduce batch size:
```bash
python train_model.py --batch-size 16
```

### Overfitting

Increase dropout or reduce model size:
```bash
python train_model.py --dropout 0.5 --lstm-units 128
```

### Slow Training

Use GPU if available (TensorFlow auto-detects):
```python
# Check GPU availability
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

### Low Accuracy

- Increase epochs: `--epochs 100`
- Increase model capacity: `--lstm-units 512 --embedding-dim 256`
- Adjust learning rate: `--lr 0.0005`

## Advanced Configuration

### Custom Data Augmentation

Edit `data_generator.py` to add augmentation:
- Chord substitution
- Rhythm variations
- Dynamic transposition

### Architecture Modifications

Edit `model_architecture.py` to customize:
- Add more LSTM layers
- Use GRU instead of LSTM
- Add attention mechanism
- Change embedding dimensions

### Training Strategies

- **Transfer Learning**: Pre-train on large dataset, fine-tune on specific genre
- **Curriculum Learning**: Start with simple progressions, gradually increase complexity
- **Ensemble Methods**: Train multiple models and combine predictions

## Next Steps

After training:

1. **Evaluate Generation Quality**:
   - Generate samples for each genre/mood
   - Check musical coherence
   - Compare to training data

2. **Export Model**:
   - Convert to TensorFlow Lite for mobile
   - Export to ONNX for cross-platform
   - Create SavedModel format for TF Serving

3. **Build API**:
   - Create REST API with Flask/FastAPI
   - Add generation endpoints
   - Deploy to cloud

4. **Create Frontend**:
   - Build React app
   - Add interactive controls
   - Visualize progressions

## References

- Model architecture inspired by music generation research
- Teacher forcing for sequence-to-sequence training
- Conditioning approach from conditional generation papers

---
**Last Updated**: October 2025
