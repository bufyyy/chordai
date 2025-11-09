"""
Simplified LSTM-based Chord Progression Generation Model
Compatible with TensorFlow 2.19+
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
import json
import os


class ChordProgressionModel:
    """Simplified LSTM model for chord progression generation"""

    def __init__(
        self,
        vocab_size,
        num_genres,
        num_moods,
        num_keys,
        num_scale_types,
        max_sequence_length=12,
        embedding_dim=128,
        lstm_units=256,
        dropout_rate=0.3
    ):
        """Initialize model parameters"""
        self.vocab_size = vocab_size
        self.num_genres = num_genres
        self.num_moods = num_moods
        self.num_keys = num_keys
        self.num_scale_types = num_scale_types
        self.max_sequence_length = max_sequence_length
        self.embedding_dim = embedding_dim
        self.lstm_units = lstm_units
        self.dropout_rate = dropout_rate
        self.model = None

    def build_model(self):
        """Build the simplified LSTM model architecture"""

        print("\nBuilding Simplified LSTM Chord Progression Model...")
        print("="*70)

        # ==================== INPUT LAYERS ====================
        # Explicit dtype and batch_size for TensorFlow.js compatibility

        chord_input = layers.Input(
            shape=(self.max_sequence_length,),
            dtype='int32',
            name='chord_sequence_input'
        )

        genre_input = layers.Input(shape=(1,), dtype='int32', name='genre_input')
        mood_input = layers.Input(shape=(1,), dtype='int32', name='mood_input')
        key_input = layers.Input(shape=(1,), dtype='int32', name='key_input')
        scale_type_input = layers.Input(shape=(1,), dtype='int32', name='scale_type_input')

        # ==================== EMBEDDING LAYERS ====================

        # Chord embedding (no mask_zero to avoid broadcasting issues)
        chord_embedding = layers.Embedding(
            input_dim=self.vocab_size,
            output_dim=self.embedding_dim,
            name='chord_embedding'
        )(chord_input)

        print(f"Chord Embedding: {self.vocab_size} -> {self.embedding_dim}D")

        # Metadata embeddings
        genre_embedding = layers.Embedding(
            input_dim=self.num_genres,
            output_dim=16,
            name='genre_embedding'
        )(genre_input)
        genre_embedding = layers.Flatten()(genre_embedding)

        mood_embedding = layers.Embedding(
            input_dim=self.num_moods,
            output_dim=16,
            name='mood_embedding'
        )(mood_input)
        mood_embedding = layers.Flatten()(mood_embedding)

        key_embedding = layers.Embedding(
            input_dim=self.num_keys,
            output_dim=12,
            name='key_embedding'
        )(key_input)
        key_embedding = layers.Flatten()(key_embedding)

        scale_embedding = layers.Embedding(
            input_dim=self.num_scale_types,
            output_dim=4,
            name='scale_embedding'
        )(scale_type_input)
        scale_embedding = layers.Flatten()(scale_embedding)

        # ==================== CONDITIONING LAYER ====================

        conditioning = layers.Concatenate(name='conditioning_concat')([
            genre_embedding,
            mood_embedding,
            key_embedding,
            scale_embedding
        ])

        conditioning_dense = layers.Dense(
            self.embedding_dim,
            activation='relu',
            name='conditioning_projection'
        )(conditioning)

        # Repeat for each timestep
        conditioning_repeated = layers.RepeatVector(
            self.max_sequence_length,
            name='conditioning_repeat'
        )(conditioning_dense)

        # ==================== COMBINE INPUTS ====================

        combined = layers.Concatenate(name='combine_inputs')([
            chord_embedding,
            conditioning_repeated
        ])

        print(f"Combined Input Shape: [batch, {self.max_sequence_length}, {self.embedding_dim * 2}]")

        # ==================== LSTM LAYERS ====================

        lstm_1 = layers.LSTM(
            self.lstm_units,
            return_sequences=True,
            name='lstm_layer_1'
        )(combined)

        lstm_1 = layers.Dropout(self.dropout_rate, name='dropout_1')(lstm_1)

        lstm_2 = layers.LSTM(
            self.lstm_units,
            return_sequences=True,
            name='lstm_layer_2'
        )(lstm_1)

        lstm_2 = layers.Dropout(self.dropout_rate, name='dropout_2')(lstm_2)

        print(f"LSTM Layers: 2x {self.lstm_units} units with dropout={self.dropout_rate}")

        # ==================== OUTPUT LAYER ====================

        output = layers.TimeDistributed(
            layers.Dense(self.vocab_size, activation='softmax'),
            name='output_layer'
        )(lstm_2)

        print(f"Output Shape: [batch, {self.max_sequence_length}, {self.vocab_size}]")

        # ==================== BUILD MODEL ====================

        self.model = models.Model(
            inputs=[
                chord_input,
                genre_input,
                mood_input,
                key_input,
                scale_type_input
            ],
            outputs=output,
            name='chord_progression_lstm'
        )

        print("="*70)
        print("Model built successfully!")

        return self.model

    def compile_model(self, learning_rate=0.001):
        """Compile the model"""

        if self.model is None:
            raise ValueError("Model must be built before compilation")

        optimizer = keras.optimizers.Adam(learning_rate=learning_rate)

        self.model.compile(
            optimizer=optimizer,
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )

        print(f"\nModel compiled with:")
        print(f"  Optimizer: Adam (lr={learning_rate})")
        print(f"  Loss: sparse_categorical_crossentropy")
        print(f"  Metrics: accuracy")

    def summary(self):
        """Print model summary"""
        if self.model is None:
            raise ValueError("Model must be built first")

        print("\n" + "="*70)
        print("MODEL SUMMARY")
        print("="*70 + "\n")
        self.model.summary()

        trainable_params = sum([tf.size(w).numpy() for w in self.model.trainable_weights])
        non_trainable_params = sum([tf.size(w).numpy() for w in self.model.non_trainable_weights])

        print("\n" + "="*70)
        print(f"Total Parameters: {trainable_params + non_trainable_params:,}")
        print(f"Trainable Parameters: {trainable_params:,}")
        print(f"Non-trainable Parameters: {non_trainable_params:,}")
        print("="*70 + "\n")


def load_vocabularies(data_dir='../dataset'):
    """Load vocabulary sizes from dataset"""

    with open(os.path.join(data_dir, 'chord_vocab.json'), 'r', encoding='utf-8') as f:
        chord_vocab = json.load(f)

    with open(os.path.join(data_dir, 'metadata_vocab.json'), 'r', encoding='utf-8') as f:
        metadata_vocab = json.load(f)

    with open(os.path.join(data_dir, 'preprocessing_metadata.json'), 'r', encoding='utf-8') as f:
        preprocessing_meta = json.load(f)

    vocab_info = {
        'vocab_size': chord_vocab['vocab_size'],
        'num_genres': len(metadata_vocab['genre_vocab']),
        'num_moods': len(metadata_vocab['mood_vocab']),
        'num_keys': len(metadata_vocab['key_vocab']),
        'num_scale_types': len(metadata_vocab['scale_type_vocab']),
        'max_sequence_length': preprocessing_meta['max_sequence_length']
    }

    return vocab_info


if __name__ == "__main__":
    print("\n" + "="*70)
    print("SIMPLIFIED CHORD PROGRESSION LSTM MODEL")
    print("="*70 + "\n")

    vocab_info = load_vocabularies()

    print("Vocabulary Info:")
    for key, value in vocab_info.items():
        print(f"  {key}: {value}")

    model_builder = ChordProgressionModel(
        vocab_size=vocab_info['vocab_size'],
        num_genres=vocab_info['num_genres'],
        num_moods=vocab_info['num_moods'],
        num_keys=vocab_info['num_keys'],
        num_scale_types=vocab_info['num_scale_types'],
        max_sequence_length=vocab_info['max_sequence_length'],
        embedding_dim=128,
        lstm_units=256,
        dropout_rate=0.3
    )

    model = model_builder.build_model()
    model_builder.compile_model(learning_rate=0.001)
    model_builder.summary()

    print("\n" + "="*70)
    print("Model architecture created successfully!")
    print("="*70 + "\n")
