"""
Model Training Script

Trains the LSTM chord progression model with callbacks and monitoring
"""

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.callbacks import (
        ModelCheckpoint, EarlyStopping, ReduceLROnPlateau,
        TensorBoard, CSVLogger
    )
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Error: TensorFlow not available")

import os
import json
from datetime import datetime
import argparse

from model_architecture import ChordProgressionModel, load_vocabularies
from data_generator import create_data_generators


class TrainingConfig:
    """Configuration for model training"""

    def __init__(self):
        # Model hyperparameters
        self.embedding_dim = 128
        self.lstm_units = 256
        self.dropout_rate = 0.3

        # Training hyperparameters
        self.batch_size = 32
        self.epochs = 50
        self.learning_rate = 0.001
        self.patience_early_stop = 10
        self.patience_reduce_lr = 5

        # Paths
        self.data_dir = '../dataset'
        self.output_dir = './output'
        self.checkpoint_dir = './checkpoints'
        self.logs_dir = './logs'

        # Create directories
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.checkpoint_dir, exist_ok=True)
        os.makedirs(self.logs_dir, exist_ok=True)


def create_callbacks(config: TrainingConfig):
    """Create training callbacks"""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    callbacks = []

    # Model checkpoint - save best model
    checkpoint_path = os.path.join(
        config.checkpoint_dir,
        f'chord_model_best_{timestamp}.h5'
    )
    checkpoint = ModelCheckpoint(
        filepath=checkpoint_path,
        monitor='val_loss',
        save_best_only=True,
        save_weights_only=False,
        mode='min',
        verbose=1
    )
    callbacks.append(checkpoint)

    # Early stopping
    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=config.patience_early_stop,
        restore_best_weights=True,
        verbose=1
    )
    callbacks.append(early_stop)

    # Reduce learning rate on plateau
    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=config.patience_reduce_lr,
        min_lr=1e-6,
        verbose=1
    )
    callbacks.append(reduce_lr)

    # TensorBoard logging
    tensorboard_dir = os.path.join(config.logs_dir, f'tb_{timestamp}')
    tensorboard = TensorBoard(
        log_dir=tensorboard_dir,
        histogram_freq=1,
        write_graph=True,
        update_freq='epoch'
    )
    callbacks.append(tensorboard)

    # CSV logger
    csv_path = os.path.join(config.output_dir, f'training_log_{timestamp}.csv')
    csv_logger = CSVLogger(csv_path, separator=',', append=False)
    callbacks.append(csv_logger)

    print(f"\nCallbacks configured:")
    print(f"  - Model checkpoint: {checkpoint_path}")
    print(f"  - Early stopping: patience={config.patience_early_stop}")
    print(f"  - Reduce LR: patience={config.patience_reduce_lr}")
    print(f"  - TensorBoard: {tensorboard_dir}")
    print(f"  - CSV log: {csv_path}")

    return callbacks, checkpoint_path


def train_model(config: TrainingConfig):
    """Main training function"""

    print("\n" + "="*70)
    print("CHORD PROGRESSION MODEL TRAINING")
    print("="*70 + "\n")

    # Load vocabulary information
    print("Loading vocabulary information...")
    vocab_info = load_vocabularies(config.data_dir)

    print("\nVocabulary sizes:")
    for key, value in vocab_info.items():
        print(f"  {key}: {value}")

    # Create data generators
    print("\n" + "-"*70)
    train_gen, val_gen, test_gen = create_data_generators(
        batch_size=config.batch_size,
        data_dir=config.data_dir,
        augment_train=False
    )

    # Build model
    print("\n" + "-"*70)
    model_builder = ChordProgressionModel(
        vocab_size=vocab_info['vocab_size'],
        num_genres=vocab_info['num_genres'],
        num_moods=vocab_info['num_moods'],
        num_keys=vocab_info['num_keys'],
        num_scale_types=vocab_info['num_scale_types'],
        max_sequence_length=vocab_info['max_sequence_length'],
        embedding_dim=config.embedding_dim,
        lstm_units=config.lstm_units,
        dropout_rate=config.dropout_rate
    )

    model = model_builder.build_model()
    model_builder.compile_model(learning_rate=config.learning_rate)
    model_builder.summary()

    # Create callbacks
    print("\n" + "-"*70)
    callbacks, checkpoint_path = create_callbacks(config)

    # Save training configuration
    config_dict = {
        'training_config': {
            'embedding_dim': config.embedding_dim,
            'lstm_units': config.lstm_units,
            'dropout_rate': config.dropout_rate,
            'batch_size': config.batch_size,
            'epochs': config.epochs,
            'learning_rate': config.learning_rate,
            'patience_early_stop': config.patience_early_stop,
            'patience_reduce_lr': config.patience_reduce_lr
        },
        'vocab_info': vocab_info,
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    config_path = os.path.join(config.output_dir, 'training_config.json')
    with open(config_path, 'w') as f:
        json.dump(config_dict, f, indent=2)

    print(f"\nTraining configuration saved to {config_path}")

    # Train model
    print("\n" + "="*70)
    print("STARTING TRAINING")
    print("="*70 + "\n")

    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=config.epochs,
        callbacks=callbacks,
        verbose=1
    )

    # Save final model
    final_model_path = os.path.join(config.output_dir, 'chord_model_final.h5')
    model.save(final_model_path)
    print(f"\nFinal model saved to {final_model_path}")

    # Save training history
    history_path = os.path.join(config.output_dir, 'training_history.json')
    history_dict = {
        'history': {key: [float(val) for val in values]
                   for key, values in history.history.items()},
        'final_epoch': len(history.history['loss']),
        'best_val_loss': float(min(history.history['val_loss'])),
        'best_val_accuracy': float(max(history.history['val_accuracy']))
    }

    with open(history_path, 'w') as f:
        json.dump(history_dict, f, indent=2)

    print(f"Training history saved to {history_path}")

    # Evaluate on test set
    print("\n" + "="*70)
    print("EVALUATING ON TEST SET")
    print("="*70 + "\n")

    test_results = model.evaluate(test_gen, verbose=1)

    print(f"\nTest Results:")
    print(f"  Test Loss: {test_results[0]:.4f}")
    print(f"  Test Accuracy: {test_results[1]:.4f}")

    # Save test results
    results_dict = {
        'test_loss': float(test_results[0]),
        'test_accuracy': float(test_results[1]),
        'best_checkpoint': checkpoint_path,
        'final_model': final_model_path
    }

    results_path = os.path.join(config.output_dir, 'test_results.json')
    with open(results_path, 'w') as f:
        json.dump(results_dict, f, indent=2)

    print(f"\nTest results saved to {results_path}")

    print("\n" + "="*70)
    print("TRAINING COMPLETE!")
    print("="*70 + "\n")

    print("Outputs saved to:")
    print(f"  - Best model: {checkpoint_path}")
    print(f"  - Final model: {final_model_path}")
    print(f"  - Training config: {config_path}")
    print(f"  - Training history: {history_path}")
    print(f"  - Test results: {results_path}")

    return model, history


def main():
    """Main entry point"""

    if not TENSORFLOW_AVAILABLE:
        print("Error: TensorFlow is required for training")
        print("Install with: pip install tensorflow")
        return

    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train chord progression model')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--epochs', type=int, default=50, help='Number of epochs')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--lstm-units', type=int, default=256, help='LSTM units')
    parser.add_argument('--embedding-dim', type=int, default=128, help='Embedding dimension')
    parser.add_argument('--dropout', type=float, default=0.3, help='Dropout rate')

    args = parser.parse_args()

    # Create config
    config = TrainingConfig()
    config.batch_size = args.batch_size
    config.epochs = args.epochs
    config.learning_rate = args.lr
    config.lstm_units = args.lstm_units
    config.embedding_dim = args.embedding_dim
    config.dropout_rate = args.dropout

    # Train model
    model, history = train_model(config)

    print("\nTo view training progress with TensorBoard, run:")
    print(f"  tensorboard --logdir {config.logs_dir}")


if __name__ == "__main__":
    main()
