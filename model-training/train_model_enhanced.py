"""
Enhanced Model Training Script with Progress Bars and Sample Generation

Features:
- Progress bars with tqdm
- Sample generation every N epochs
- Real-time training visualization
- GPU optimization
- Google Colab compatible
"""

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.callbacks import (
        ModelCheckpoint, EarlyStopping, ReduceLROnPlateau,
        TensorBoard, CSVLogger, Callback
    )
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Error: TensorFlow not available")

import os
import json
import time
from datetime import datetime, timedelta
import argparse

try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    print("Warning: tqdm not available, progress bars disabled")

from model_architecture import ChordProgressionModel, load_vocabularies
from data_generator import create_data_generators


class ProgressCallback(Callback):
    """Custom callback with progress bar and sample generation"""

    def __init__(self, generator_model=None, vocab_info=None, generate_every=10):
        super().__init__()
        self.generator_model = generator_model
        self.vocab_info = vocab_info
        self.generate_every = generate_every
        self.epoch_start_time = None
        self.training_start_time = None

    def on_train_begin(self, logs=None):
        self.training_start_time = time.time()
        print("\n" + "="*70)
        print(f"Training started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)

    def on_epoch_begin(self, epoch, logs=None):
        self.epoch_start_time = time.time()

    def on_epoch_end(self, epoch, logs=None):
        # Calculate epoch time
        epoch_time = time.time() - self.epoch_start_time

        # Print metrics
        print(f"\nEpoch {epoch + 1} completed in {epoch_time:.1f}s")
        print(f"  Loss: {logs['loss']:.4f} - Accuracy: {logs['accuracy']:.4f}")
        print(f"  Val Loss: {logs['val_loss']:.4f} - Val Accuracy: {logs['val_accuracy']:.4f}")

        # Generate samples every N epochs
        if (epoch + 1) % self.generate_every == 0 and self.generator_model:
            print(f"\n{'='*70}")
            print(f"Sample Generations (Epoch {epoch + 1}):")
            print(f"{'='*70}")
            self._generate_samples()

    def on_train_end(self, logs=None):
        total_time = time.time() - self.training_start_time
        hours, rem = divmod(total_time, 3600)
        minutes, seconds = divmod(rem, 60)

        print("\n" + "="*70)
        print(f"Training completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total training time: {int(hours)}h {int(minutes)}m {int(seconds)}s")
        print("="*70)

    def _generate_samples(self):
        """Generate and display sample progressions"""
        if not self.generator_model or not self.vocab_info:
            return

        try:
            from evaluate_model import ChordProgressionGenerator

            # Create temporary model file
            temp_model_path = './temp_model.h5'
            self.model.save(temp_model_path)

            # Generate samples
            generator = ChordProgressionGenerator(temp_model_path)

            test_cases = [
                {'genre': 'pop', 'mood': 'uplifting', 'key': 'C', 'scale_type': 'major'},
                {'genre': 'rock', 'mood': 'energetic', 'key': 'E', 'scale_type': 'major'},
                {'genre': 'jazz', 'mood': 'smooth', 'key': 'F', 'scale_type': 'major'},
            ]

            for i, case in enumerate(test_cases, 1):
                progression = generator.generate_progression(
                    genre=case['genre'],
                    mood=case['mood'],
                    key=case['key'],
                    scale_type=case['scale_type'],
                    num_chords=4,
                    temperature=0.8
                )

                print(f"\n  [{i}] {case['genre'].capitalize()} - {case['mood'].capitalize()} ({case['key']} {case['scale_type']})")
                print(f"      → {' - '.join(progression)}")

            # Clean up
            if os.path.exists(temp_model_path):
                os.remove(temp_model_path)

        except Exception as e:
            print(f"      Sample generation failed: {e}")


class TrainingConfig:
    """Configuration for model training"""

    def __init__(self):
        # Model hyperparameters
        self.embedding_dim = 128
        self.lstm_units = 256
        self.dropout_rate = 0.3

        # Training hyperparameters
        self.batch_size = 32
        self.epochs = 100
        self.learning_rate = 0.001
        self.patience_early_stop = 10
        self.patience_reduce_lr = 5

        # Sample generation
        self.generate_samples_every = 10

        # Paths
        self.data_dir = '../dataset'
        self.output_dir = './output'
        self.checkpoint_dir = './checkpoints'
        self.logs_dir = './logs'
        self.models_dir = './models'

        # Create directories
        for dir_path in [self.output_dir, self.checkpoint_dir, self.logs_dir, self.models_dir]:
            os.makedirs(dir_path, exist_ok=True)


def setup_gpu():
    """Setup GPU for training if available"""

    print("\n" + "="*70)
    print("GPU CONFIGURATION")
    print("="*70)

    gpus = tf.config.list_physical_devices('GPU')

    if gpus:
        print(f"\nFound {len(gpus)} GPU(s):")
        for i, gpu in enumerate(gpus):
            print(f"  GPU {i}: {gpu}")

        try:
            # Enable memory growth
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            print("\nGPU memory growth enabled")

            # Set mixed precision for faster training
            policy = tf.keras.mixed_precision.Policy('mixed_float16')
            tf.keras.mixed_precision.set_global_policy(policy)
            print("Mixed precision training enabled (float16)")

        except RuntimeError as e:
            print(f"GPU configuration error: {e}")
    else:
        print("\nNo GPU found, using CPU")
        print("Warning: Training will be slower on CPU")

    print("="*70)


def create_callbacks(config: TrainingConfig, vocab_info):
    """Create training callbacks"""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    callbacks = []

    # Model checkpoint - save best model
    checkpoint_path = os.path.join(
        config.models_dir,
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

    # Progress callback with sample generation
    progress_callback = ProgressCallback(
        generator_model=True,
        vocab_info=vocab_info,
        generate_every=config.generate_samples_every
    )
    callbacks.append(progress_callback)

    print(f"\nCallbacks configured:")
    print(f"  - Model checkpoint: {checkpoint_path}")
    print(f"  - Early stopping: patience={config.patience_early_stop}")
    print(f"  - Reduce LR: patience={config.patience_reduce_lr}")
    print(f"  - TensorBoard: {tensorboard_dir}")
    print(f"  - CSV log: {csv_path}")
    print(f"  - Sample generation every {config.generate_samples_every} epochs")

    return callbacks, checkpoint_path, timestamp


def plot_training_history(history, output_dir):
    """Plot and save training history"""

    try:
        import matplotlib.pyplot as plt

        fig, axes = plt.subplots(2, 2, figsize=(15, 10))

        # Loss curves
        axes[0, 0].plot(history.history['loss'], label='Train Loss')
        axes[0, 0].plot(history.history['val_loss'], label='Val Loss')
        axes[0, 0].set_title('Model Loss')
        axes[0, 0].set_xlabel('Epoch')
        axes[0, 0].set_ylabel('Loss')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)

        # Accuracy curves
        axes[0, 1].plot(history.history['accuracy'], label='Train Accuracy')
        axes[0, 1].plot(history.history['val_accuracy'], label='Val Accuracy')
        axes[0, 1].set_title('Model Accuracy')
        axes[0, 1].set_xlabel('Epoch')
        axes[0, 1].set_ylabel('Accuracy')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)

        # Learning rate (if available)
        if 'lr' in history.history:
            axes[1, 0].plot(history.history['lr'])
            axes[1, 0].set_title('Learning Rate')
            axes[1, 0].set_xlabel('Epoch')
            axes[1, 0].set_ylabel('LR')
            axes[1, 0].set_yscale('log')
            axes[1, 0].grid(True, alpha=0.3)

        # Summary stats
        best_epoch = history.history['val_loss'].index(min(history.history['val_loss'])) + 1
        best_val_loss = min(history.history['val_loss'])
        best_val_acc = max(history.history['val_accuracy'])
        final_train_acc = history.history['accuracy'][-1]

        summary_text = f"""
        Training Summary:

        Total Epochs: {len(history.history['loss'])}
        Best Epoch: {best_epoch}

        Best Val Loss: {best_val_loss:.4f}
        Best Val Accuracy: {best_val_acc:.4f}
        Final Train Accuracy: {final_train_acc:.4f}
        """

        axes[1, 1].text(0.1, 0.5, summary_text, fontsize=12, family='monospace')
        axes[1, 1].axis('off')

        plt.tight_layout()

        plot_path = os.path.join(output_dir, 'training_history.png')
        plt.savefig(plot_path, dpi=150, bbox_inches='tight')
        print(f"\nTraining history plot saved to {plot_path}")

        plt.close()

    except Exception as e:
        print(f"Warning: Could not create training plots: {e}")


def train_model(config: TrainingConfig):
    """Main training function"""

    print("\n" + "="*70)
    print("CHORD PROGRESSION MODEL TRAINING")
    print("="*70 + "\n")

    # Setup GPU
    setup_gpu()

    # Load vocabulary information
    print("\n" + "-"*70)
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
    callbacks, checkpoint_path, timestamp = create_callbacks(config, vocab_info)

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
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'gpu_available': len(tf.config.list_physical_devices('GPU')) > 0
    }

    config_path = os.path.join(config.models_dir, f'model_config_{timestamp}.json')
    with open(config_path, 'w') as f:
        json.dump(config_dict, f, indent=2)

    print(f"\nTraining configuration saved to {config_path}")

    # Train model
    print("\n" + "="*70)
    print("STARTING TRAINING")
    print("="*70 + "\n")

    training_start = time.time()

    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=config.epochs,
        callbacks=callbacks,
        verbose=2  # One line per epoch
    )

    training_time = time.time() - training_start

    # Save final model
    final_model_path = os.path.join(config.models_dir, f'chord_model_final_{timestamp}.h5')
    model.save(final_model_path)
    print(f"\nFinal model saved to {final_model_path}")

    # Save training history
    history_path = os.path.join(config.output_dir, f'training_history_{timestamp}.json')
    history_dict = {
        'history': {key: [float(val) for val in values]
                   for key, values in history.history.items()},
        'final_epoch': len(history.history['loss']),
        'best_val_loss': float(min(history.history['val_loss'])),
        'best_val_accuracy': float(max(history.history['val_accuracy'])),
        'best_epoch': int(history.history['val_loss'].index(min(history.history['val_loss'])) + 1),
        'training_time_seconds': training_time
    }

    with open(history_path, 'w') as f:
        json.dump(history_dict, f, indent=2)

    print(f"Training history saved to {history_path}")

    # Plot training history
    plot_training_history(history, config.output_dir)

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
        'final_model': final_model_path,
        'config': config_path,
        'training_time_seconds': training_time,
        'best_epoch': history_dict['best_epoch'],
        'best_val_loss': history_dict['best_val_loss'],
        'best_val_accuracy': history_dict['best_val_accuracy']
    }

    results_path = os.path.join(config.output_dir, f'test_results_{timestamp}.json')
    with open(results_path, 'w') as f:
        json.dump(results_dict, f, indent=2)

    print(f"\nTest results saved to {results_path}")

    # Final summary
    print("\n" + "="*70)
    print("TRAINING SUMMARY")
    print("="*70)
    print(f"\nTotal training time: {timedelta(seconds=int(training_time))}")
    print(f"Best epoch: {history_dict['best_epoch']}")
    print(f"Best validation loss: {history_dict['best_val_loss']:.4f}")
    print(f"Best validation accuracy: {history_dict['best_val_accuracy']:.4f}")
    print(f"Test loss: {test_results[0]:.4f}")
    print(f"Test accuracy: {test_results[1]:.4f}")

    print("\nOutputs saved to:")
    print(f"  - Best model: {checkpoint_path}")
    print(f"  - Final model: {final_model_path}")
    print(f"  - Model config: {config_path}")
    print(f"  - Training history: {history_path}")
    print(f"  - Test results: {results_path}")
    print("="*70 + "\n")

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
    parser.add_argument('--epochs', type=int, default=100, help='Number of epochs')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--lstm-units', type=int, default=256, help='LSTM units')
    parser.add_argument('--embedding-dim', type=int, default=128, help='Embedding dimension')
    parser.add_argument('--dropout', type=float, default=0.3, help='Dropout rate')
    parser.add_argument('--generate-every', type=int, default=10, help='Generate samples every N epochs')

    args = parser.parse_args()

    # Create config
    config = TrainingConfig()
    config.batch_size = args.batch_size
    config.epochs = args.epochs
    config.learning_rate = args.lr
    config.lstm_units = args.lstm_units
    config.embedding_dim = args.embedding_dim
    config.dropout_rate = args.dropout
    config.generate_samples_every = args.generate_every

    # Train model
    model, history = train_model(config)

    print("\nTo view training progress with TensorBoard, run:")
    print(f"  tensorboard --logdir {config.logs_dir}")


if __name__ == "__main__":
    main()
