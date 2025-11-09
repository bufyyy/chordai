"""
Custom Data Generator for Chord Progression Model Training

Provides efficient batch loading and data augmentation
"""

try:
    import tensorflow as tf
    from tensorflow import keras
    import numpy as np
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Warning: TensorFlow/NumPy not available")

import json
import random
from typing import List, Dict, Tuple


class ChordProgressionGenerator(keras.utils.Sequence):
    """
    Custom data generator for chord progression training

    Generates batches of data with:
    - Input sequences (chords with context)
    - Conditioning information (genre, mood, key)
    - Target sequences (next chords to predict)
    """

    def __init__(
        self,
        data: List[Dict],
        batch_size: int = 32,
        max_sequence_length: int = 12,
        shuffle: bool = True,
        augment: bool = False
    ):
        """
        Initialize data generator

        Args:
            data: List of preprocessed progression dictionaries
            batch_size: Batch size for training
            max_sequence_length: Maximum sequence length
            shuffle: Whether to shuffle data after each epoch
            augment: Whether to apply data augmentation
        """
        self.data = data
        self.batch_size = batch_size
        self.max_sequence_length = max_sequence_length
        self.shuffle = shuffle
        self.augment = augment

        self.indexes = np.arange(len(self.data))
        if self.shuffle:
            np.random.shuffle(self.indexes)

    def __len__(self):
        """Number of batches per epoch"""
        return int(np.ceil(len(self.data) / self.batch_size))

    def __getitem__(self, index):
        """
        Generate one batch of data

        Returns:
            tuple: (inputs, targets)
                inputs: dict with keys ['chord_sequence_input', 'genre_input', 'mood_input', 'key_input', 'scale_type_input']
                targets: array of shape (batch_size, max_sequence_length)
        """
        # Get batch indexes
        batch_indexes = self.indexes[index * self.batch_size:(index + 1) * self.batch_size]

        # Generate batch
        inputs, targets = self._generate_batch(batch_indexes)

        return inputs, targets

    def on_epoch_end(self):
        """Shuffle data after each epoch"""
        if self.shuffle:
            np.random.shuffle(self.indexes)

    def _generate_batch(self, batch_indexes):
        """Generate one batch of data"""

        batch_size = len(batch_indexes)

        # Initialize arrays
        chord_sequences = np.zeros((batch_size, self.max_sequence_length), dtype=np.int32)
        genre_ids = np.zeros((batch_size, 1), dtype=np.int32)
        mood_ids = np.zeros((batch_size, 1), dtype=np.int32)
        key_ids = np.zeros((batch_size, 1), dtype=np.int32)
        scale_ids = np.zeros((batch_size, 1), dtype=np.int32)
        targets = np.zeros((batch_size, self.max_sequence_length), dtype=np.int32)

        # Fill batch
        for i, idx in enumerate(batch_indexes):
            sample = self.data[idx]

            # Get encoded progression
            progression = sample['progression_encoded'][:self.max_sequence_length]

            # Create input-target pairs
            # Input: chords[0:n-1], Target: chords[1:n]
            # For teacher forcing during training
            chord_sequences[i] = progression
            targets[i] = self._create_target_sequence(progression)

            # Get conditioning
            genre_ids[i] = sample['genre_encoded']
            mood_ids[i] = sample['mood_encoded']
            key_ids[i] = sample['key_encoded']
            scale_ids[i] = sample['scale_type_encoded']

        # Create input dictionary
        inputs = {
            'chord_sequence_input': chord_sequences,
            'genre_input': genre_ids,
            'mood_input': mood_ids,
            'key_input': key_ids,
            'scale_type_input': scale_ids
        }

        return inputs, targets

    def _create_target_sequence(self, progression):
        """
        Create target sequence for teacher forcing

        Given input sequence [c1, c2, c3, PAD, PAD, ...],
        target is [c2, c3, PAD, PAD, PAD, ...]

        Args:
            progression: Input chord sequence

        Returns:
            Target sequence (shifted by 1)
        """
        # Shift progression by 1
        target = np.zeros_like(progression)
        target[:-1] = progression[1:]  # Shift left
        target[-1] = 0  # Last position is PAD (or could be END token)

        return target

    def _augment_sequence(self, progression, genre, mood, key):
        """
        Apply data augmentation (optional)

        Possible augmentations:
        - Random chord substitution
        - Truncation/extension
        - Transposition (already done in preprocessing)

        Args:
            progression: Chord sequence
            genre: Genre ID
            mood: Mood ID
            key: Key ID

        Returns:
            Augmented progression
        """
        # For now, return as-is
        # Can be extended with more augmentation strategies
        return progression


class InferenceGenerator:
    """
    Generator for inference/generation mode

    Given conditioning (genre, mood, key) and optional seed chords,
    prepares input for model prediction
    """

    def __init__(self, max_sequence_length=12):
        self.max_sequence_length = max_sequence_length

    def prepare_input(
        self,
        seed_chords: List[int],
        genre_id: int,
        mood_id: int,
        key_id: int,
        scale_type_id: int
    ) -> Dict:
        """
        Prepare input for model inference

        Args:
            seed_chords: List of chord IDs to start generation
            genre_id: Genre conditioning
            mood_id: Mood conditioning
            key_id: Key conditioning
            scale_type_id: Scale type conditioning

        Returns:
            Dictionary of model inputs
        """
        # Pad seed chords
        chord_sequence = np.zeros((1, self.max_sequence_length), dtype=np.int32)
        chord_sequence[0, :len(seed_chords)] = seed_chords

        inputs = {
            'chord_sequence_input': chord_sequence,
            'genre_input': np.array([[genre_id]], dtype=np.int32),
            'mood_input': np.array([[mood_id]], dtype=np.int32),
            'key_input': np.array([[key_id]], dtype=np.int32),
            'scale_type_input': np.array([[scale_type_id]], dtype=np.int32)
        }

        return inputs


def load_training_data(data_dir='../dataset'):
    """Load preprocessed training, validation, and test data"""

    with open(f'{data_dir}/train.json', 'r', encoding='utf-8') as f:
        train_data = json.load(f)

    with open(f'{data_dir}/val.json', 'r', encoding='utf-8') as f:
        val_data = json.load(f)

    with open(f'{data_dir}/test.json', 'r', encoding='utf-8') as f:
        test_data = json.load(f)

    return train_data, val_data, test_data


def create_data_generators(
    batch_size=32,
    data_dir='../dataset',
    augment_train=False
):
    """
    Create data generators for training, validation, and testing

    Args:
        batch_size: Batch size for training
        data_dir: Directory containing preprocessed data
        augment_train: Whether to augment training data

    Returns:
        tuple: (train_generator, val_generator, test_generator)
    """

    # Load data
    train_data, val_data, test_data = load_training_data(data_dir)

    print(f"\nCreating data generators...")
    print(f"  Train samples: {len(train_data)}")
    print(f"  Validation samples: {len(val_data)}")
    print(f"  Test samples: {len(test_data)}")
    print(f"  Batch size: {batch_size}")

    # Create generators
    train_generator = ChordProgressionGenerator(
        data=train_data,
        batch_size=batch_size,
        shuffle=True,
        augment=augment_train
    )

    val_generator = ChordProgressionGenerator(
        data=val_data,
        batch_size=batch_size,
        shuffle=False,
        augment=False
    )

    test_generator = ChordProgressionGenerator(
        data=test_data,
        batch_size=batch_size,
        shuffle=False,
        augment=False
    )

    print(f"  Train batches per epoch: {len(train_generator)}")
    print(f"  Validation batches: {len(val_generator)}")
    print(f"  Test batches: {len(test_generator)}")

    return train_generator, val_generator, test_generator


def test_generator():
    """Test data generator functionality"""

    print("\n" + "="*70)
    print("TESTING DATA GENERATOR")
    print("="*70 + "\n")

    # Load data
    train_data, val_data, test_data = load_training_data()

    print(f"Loaded {len(train_data)} training samples")

    # Create generator
    generator = ChordProgressionGenerator(
        data=train_data,
        batch_size=8,
        shuffle=True
    )

    print(f"Generator has {len(generator)} batches")

    # Get one batch
    inputs, targets = generator[0]

    print("\n" + "-"*70)
    print("SAMPLE BATCH:")
    print("-"*70)

    print("\nInput shapes:")
    for key, value in inputs.items():
        print(f"  {key}: {value.shape}")

    print(f"\nTarget shape: {targets.shape}")

    print("\n" + "-"*70)
    print("SAMPLE DATA (first item in batch):")
    print("-"*70)

    print(f"\nChord sequence: {inputs['chord_sequence_input'][0][:8]}")
    print(f"Target sequence: {targets[0][:8]}")
    print(f"Genre ID: {inputs['genre_input'][0]}")
    print(f"Mood ID: {inputs['mood_input'][0]}")
    print(f"Key ID: {inputs['key_input'][0]}")
    print(f"Scale Type ID: {inputs['scale_type_input'][0]}")

    print("\n" + "="*70)
    print("Data generator test complete!")
    print("="*70 + "\n")


def main():
    """Main function for testing"""

    if not TENSORFLOW_AVAILABLE:
        print("TensorFlow/NumPy not available. Please install:")
        print("  pip install tensorflow numpy")
        return

    test_generator()


if __name__ == "__main__":
    main()
