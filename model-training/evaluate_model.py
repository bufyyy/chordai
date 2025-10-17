"""
Model Evaluation and Generation Script

Evaluates trained model and generates sample chord progressions
"""

try:
    import tensorflow as tf
    from tensorflow import keras
    import numpy as np
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Error: TensorFlow/NumPy not available")

import json
import os
import argparse
from typing import List, Dict

from data_generator import create_data_generators, InferenceGenerator


class ChordProgressionGenerator:
    """Generate chord progressions using trained model"""

    def __init__(self, model_path, vocab_path='../dataset'):
        """
        Initialize generator

        Args:
            model_path: Path to trained model
            vocab_path: Path to vocabulary files
        """
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required")

        # Load model
        print(f"Loading model from {model_path}...")
        self.model = keras.models.load_model(model_path)
        print("Model loaded successfully!")

        # Load vocabularies
        with open(os.path.join(vocab_path, 'chord_vocab.json'), 'r', encoding='utf-8') as f:
            self.chord_vocab = json.load(f)

        with open(os.path.join(vocab_path, 'metadata_vocab.json'), 'r', encoding='utf-8') as f:
            self.metadata_vocab = json.load(f)

        # Create reverse mappings
        self.id_to_chord = {int(k): v for k, v in self.chord_vocab['id_to_chord'].items()}
        self.genre_to_id = self.metadata_vocab['genre_vocab']
        self.mood_to_id = self.metadata_vocab['mood_vocab']
        self.key_to_id = self.metadata_vocab['key_vocab']
        self.scale_to_id = self.metadata_vocab['scale_type_vocab']

        # Reverse lookups
        self.id_to_genre = {v: k for k, v in self.genre_to_id.items()}
        self.id_to_mood = {v: k for k, v in self.mood_to_id.items()}
        self.id_to_key = {v: k for k, v in self.key_to_id.items()}
        self.id_to_scale = {v: k for k, v in self.scale_to_id.items()}

        self.inference_gen = InferenceGenerator(max_sequence_length=12)

        print("Vocabularies loaded!")
        print(f"  Chord vocab size: {len(self.id_to_chord)}")
        print(f"  Genres: {list(self.genre_to_id.keys())}")
        print(f"  Available moods: {len(self.mood_to_id)}")

    def generate_progression(
        self,
        genre: str,
        mood: str,
        key: str,
        scale_type: str = 'major',
        num_chords: int = 4,
        temperature: float = 1.0,
        seed_chords: List[str] = None
    ) -> List[str]:
        """
        Generate a chord progression

        Args:
            genre: Genre name (e.g., 'pop', 'rock', 'jazz')
            mood: Mood name (e.g., 'uplifting', 'melancholic')
            key: Key name (e.g., 'C', 'Am', 'F#')
            scale_type: 'major' or 'minor'
            num_chords: Number of chords to generate
            temperature: Sampling temperature (higher = more random)
            seed_chords: Optional starting chords

        Returns:
            List of chord names
        """
        # Get IDs
        genre_id = self.genre_to_id.get(genre, 0)
        mood_id = self.mood_to_id.get(mood, 0)
        key_id = self.key_to_id.get(key, 0)
        scale_id = self.scale_to_id.get(scale_type, 0)

        # Initialize sequence
        if seed_chords:
            # Convert seed chords to IDs
            chord_to_id = self.chord_vocab['chord_to_id']
            current_sequence = [chord_to_id.get(c, 0) for c in seed_chords]
        else:
            # Start with START token
            start_token_id = self.chord_vocab['chord_to_id'].get('<START>', 1)
            current_sequence = [start_token_id]

        generated_chords = []

        # Generate chords one by one
        for _ in range(num_chords):
            # Prepare input
            inputs = self.inference_gen.prepare_input(
                seed_chords=current_sequence,
                genre_id=genre_id,
                mood_id=mood_id,
                key_id=key_id,
                scale_type_id=scale_id
            )

            # Predict next chord
            predictions = self.model.predict(inputs, verbose=0)

            # Get prediction at current position
            current_pos = len(current_sequence) - 1
            if current_pos >= predictions.shape[1]:
                current_pos = predictions.shape[1] - 1

            next_chord_probs = predictions[0, current_pos, :]

            # Sample from distribution
            next_chord_id = self._sample_with_temperature(next_chord_probs, temperature)

            # Stop if PAD or END token
            if next_chord_id == 0 or next_chord_id == 2:  # PAD or END
                break

            # Add to sequence
            current_sequence.append(next_chord_id)
            chord_name = self.id_to_chord.get(next_chord_id, '<UNK>')
            generated_chords.append(chord_name)

        return generated_chords

    def _sample_with_temperature(self, logits, temperature=1.0):
        """Sample from probability distribution with temperature"""

        # Apply temperature
        logits = np.array(logits) / temperature

        # Softmax
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)

        # Sample
        return np.random.choice(len(probs), p=probs)


def evaluate_model(model_path, data_dir='../dataset'):
    """Evaluate model on test set"""

    print("\n" + "="*70)
    print("MODEL EVALUATION")
    print("="*70 + "\n")

    # Load model
    print(f"Loading model from {model_path}...")
    model = keras.models.load_model(model_path)
    print("Model loaded successfully!")

    # Create test generator
    print("\nCreating test data generator...")
    _, _, test_gen = create_data_generators(
        batch_size=32,
        data_dir=data_dir
    )

    # Evaluate
    print("\nEvaluating on test set...")
    results = model.evaluate(test_gen, verbose=1)

    print("\n" + "-"*70)
    print("TEST RESULTS:")
    print("-"*70)
    print(f"  Test Loss: {results[0]:.4f}")
    print(f"  Test Accuracy: {results[1]:.4f}")
    print("-"*70)

    return results


def generate_samples(model_path, num_samples=10):
    """Generate sample progressions"""

    print("\n" + "="*70)
    print("GENERATING SAMPLE PROGRESSIONS")
    print("="*70 + "\n")

    # Create generator
    generator = ChordProgressionGenerator(model_path)

    # Define test cases
    test_cases = [
        {'genre': 'pop', 'mood': 'uplifting', 'key': 'C', 'scale_type': 'major'},
        {'genre': 'rock', 'mood': 'energetic', 'key': 'E', 'scale_type': 'major'},
        {'genre': 'jazz', 'mood': 'smooth', 'key': 'F', 'scale_type': 'major'},
        {'genre': 'blues', 'mood': 'groovy', 'key': 'A', 'scale_type': 'major'},
        {'genre': 'pop', 'mood': 'melancholic', 'key': 'Am', 'scale_type': 'minor'},
        {'genre': 'edm', 'mood': 'energetic', 'key': 'G', 'scale_type': 'major'},
        {'genre': 'rnb', 'mood': 'soulful', 'key': 'D', 'scale_type': 'major'},
        {'genre': 'classical', 'mood': 'serious', 'key': 'Dm', 'scale_type': 'minor'},
    ]

    samples = []

    for i, test_case in enumerate(test_cases[:num_samples], 1):
        print(f"\n[{i}] Generating progression:")
        print(f"    Genre: {test_case['genre']}")
        print(f"    Mood: {test_case['mood']}")
        print(f"    Key: {test_case['key']} {test_case['scale_type']}")

        try:
            progression = generator.generate_progression(
                genre=test_case['genre'],
                mood=test_case['mood'],
                key=test_case['key'],
                scale_type=test_case['scale_type'],
                num_chords=4,
                temperature=0.8
            )

            print(f"    Result: {' - '.join(progression)}")

            samples.append({
                'conditioning': test_case,
                'progression': progression
            })

        except Exception as e:
            print(f"    Error: {e}")

    # Save samples
    output_path = './output/generated_samples.json'
    os.makedirs('./output', exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(samples, f, indent=2, ensure_ascii=False)

    print(f"\nGenerated samples saved to {output_path}")

    return samples


def main():
    """Main entry point"""

    if not TENSORFLOW_AVAILABLE:
        print("Error: TensorFlow is required")
        return

    parser = argparse.ArgumentParser(description='Evaluate and generate with chord model')
    parser.add_argument('--model', type=str, default='./output/chord_model_final.h5',
                       help='Path to trained model')
    parser.add_argument('--evaluate', action='store_true',
                       help='Evaluate model on test set')
    parser.add_argument('--generate', action='store_true',
                       help='Generate sample progressions')
    parser.add_argument('--num-samples', type=int, default=10,
                       help='Number of samples to generate')

    args = parser.parse_args()

    if args.evaluate:
        evaluate_model(args.model)

    if args.generate:
        generate_samples(args.model, num_samples=args.num_samples)

    if not args.evaluate and not args.generate:
        print("Please specify --evaluate and/or --generate")
        print("Example: python evaluate_model.py --model path/to/model.h5 --evaluate --generate")


if __name__ == "__main__":
    main()
