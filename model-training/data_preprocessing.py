"""
Data Preprocessing Pipeline for Chord Progression ML Model

This script:
1. Loads the chord progression dataset
2. Creates vocabularies for chords, genres, moods, and keys
3. Encodes progressions into integer sequences
4. Performs train/val/test split
5. Applies sequence padding
6. Saves processed data for model training
"""

import json
import random
from collections import Counter
from datetime import datetime
import os


class ChordProgressionPreprocessor:
    """Preprocessor for chord progression data"""

    def __init__(self, max_sequence_length=12):
        self.max_sequence_length = max_sequence_length
        self.chord_vocab = {}
        self.chord_to_id = {}
        self.id_to_chord = {}
        self.genre_vocab = {}
        self.mood_vocab = {}
        self.key_vocab = {}
        self.scale_type_vocab = {}

        # Special tokens
        self.PAD_TOKEN = "<PAD>"
        self.START_TOKEN = "<START>"
        self.END_TOKEN = "<END>"
        self.UNK_TOKEN = "<UNK>"

    def build_vocabularies(self, progressions):
        """Build vocabularies from the dataset"""

        print("Building vocabularies...")

        # Collect all unique values
        all_chords = set()
        all_genres = set()
        all_moods = set()
        all_keys = set()
        all_scale_types = set()

        for prog in progressions:
            all_chords.update(prog['progression'])
            all_genres.add(prog['genre'])
            all_moods.add(prog['mood'])
            all_keys.add(prog['key'])
            all_scale_types.add(prog['scale_type'])

        # Build chord vocabulary with special tokens
        chord_list = [self.PAD_TOKEN, self.START_TOKEN, self.END_TOKEN, self.UNK_TOKEN]
        chord_list.extend(sorted(all_chords))

        self.chord_to_id = {chord: idx for idx, chord in enumerate(chord_list)}
        self.id_to_chord = {idx: chord for chord, idx in self.chord_to_id.items()}
        self.chord_vocab = {
            'vocab_size': len(chord_list),
            'chord_to_id': self.chord_to_id,
            'id_to_chord': self.id_to_chord,
            'special_tokens': {
                'pad': self.PAD_TOKEN,
                'start': self.START_TOKEN,
                'end': self.END_TOKEN,
                'unk': self.UNK_TOKEN
            }
        }

        # Build other vocabularies
        self.genre_vocab = {genre: idx for idx, genre in enumerate(sorted(all_genres))}
        self.mood_vocab = {mood: idx for idx, mood in enumerate(sorted(all_moods))}
        self.key_vocab = {key: idx for idx, key in enumerate(sorted(all_keys))}
        self.scale_type_vocab = {st: idx for idx, st in enumerate(sorted(all_scale_types))}

        print(f"[OK] Chord vocabulary size: {len(chord_list)}")
        print(f"[OK] Genre vocabulary size: {len(self.genre_vocab)}")
        print(f"[OK] Mood vocabulary size: {len(self.mood_vocab)}")
        print(f"[OK] Key vocabulary size: {len(self.key_vocab)}")
        print(f"[OK] Scale type vocabulary size: {len(self.scale_type_vocab)}")

    def encode_progression(self, progression):
        """Encode a chord progression to integer IDs"""
        encoded = []
        for chord in progression:
            if chord in self.chord_to_id:
                encoded.append(self.chord_to_id[chord])
            else:
                encoded.append(self.chord_to_id[self.UNK_TOKEN])
        return encoded

    def decode_progression(self, encoded):
        """Decode integer IDs back to chord names"""
        return [self.id_to_chord.get(idx, self.UNK_TOKEN) for idx in encoded]

    def pad_sequence(self, sequence, max_length=None):
        """Pad or truncate sequence to max_length"""
        if max_length is None:
            max_length = self.max_sequence_length

        pad_id = self.chord_to_id[self.PAD_TOKEN]

        if len(sequence) > max_length:
            # Truncate
            return sequence[:max_length]
        elif len(sequence) < max_length:
            # Pad
            padding = [pad_id] * (max_length - len(sequence))
            return sequence + padding
        else:
            return sequence

    def preprocess_dataset(self, progressions):
        """Preprocess the entire dataset"""

        print(f"\nPreprocessing {len(progressions)} progressions...")

        processed = []

        for prog in progressions:
            # Encode progression
            encoded_prog = self.encode_progression(prog['progression'])

            # Pad sequence
            padded_prog = self.pad_sequence(encoded_prog)

            # Encode metadata
            processed_item = {
                'id': prog['id'],
                'progression_encoded': padded_prog,
                'progression_original': prog['progression'],
                'progression_length': len(prog['progression']),
                'roman_numerals': prog['roman_numerals'],
                'genre_encoded': self.genre_vocab.get(prog['genre'], 0),
                'genre': prog['genre'],
                'mood_encoded': self.mood_vocab.get(prog['mood'], 0),
                'mood': prog['mood'],
                'key_encoded': self.key_vocab.get(prog['key'], 0),
                'key': prog['key'],
                'scale_type_encoded': self.scale_type_vocab.get(prog['scale_type'], 0),
                'scale_type': prog['scale_type'],
                'song_name': prog.get('song_name', ''),
                'source': prog.get('source', 'original')
            }

            processed.append(processed_item)

        print(f"[OK] Preprocessed {len(processed)} progressions")
        return processed

    def save_vocabularies(self, output_dir):
        """Save vocabularies to JSON files"""

        print("\nSaving vocabularies...")

        # Save chord vocabulary
        with open(os.path.join(output_dir, 'chord_vocab.json'), 'w', encoding='utf-8') as f:
            json.dump(self.chord_vocab, f, indent=2, ensure_ascii=False)

        # Save metadata vocabularies
        metadata_vocab = {
            'genre_vocab': self.genre_vocab,
            'mood_vocab': self.mood_vocab,
            'key_vocab': self.key_vocab,
            'scale_type_vocab': self.scale_type_vocab
        }

        with open(os.path.join(output_dir, 'metadata_vocab.json'), 'w', encoding='utf-8') as f:
            json.dump(metadata_vocab, f, indent=2, ensure_ascii=False)

        print(f"[OK] Saved vocabularies to {output_dir}")


def split_dataset(data, train_ratio=0.8, val_ratio=0.15, test_ratio=0.05, seed=42):
    """Split dataset into train/val/test sets"""

    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, "Ratios must sum to 1.0"

    print(f"\nSplitting dataset (train={train_ratio}, val={val_ratio}, test={test_ratio})...")

    # Set random seed for reproducibility
    random.seed(seed)

    # Shuffle data
    shuffled_data = data.copy()
    random.shuffle(shuffled_data)

    # Calculate split points
    n_total = len(shuffled_data)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)

    # Split
    train_data = shuffled_data[:n_train]
    val_data = shuffled_data[n_train:n_train + n_val]
    test_data = shuffled_data[n_train + n_val:]

    print(f"[OK] Train: {len(train_data)} samples")
    print(f"[OK] Validation: {len(val_data)} samples")
    print(f"[OK] Test: {len(test_data)} samples")

    return train_data, val_data, test_data


def save_split_data(train_data, val_data, test_data, output_dir):
    """Save train/val/test splits to JSON files"""

    print("\nSaving split datasets...")

    with open(os.path.join(output_dir, 'train.json'), 'w', encoding='utf-8') as f:
        json.dump(train_data, f, indent=2, ensure_ascii=False)

    with open(os.path.join(output_dir, 'val.json'), 'w', encoding='utf-8') as f:
        json.dump(val_data, f, indent=2, ensure_ascii=False)

    with open(os.path.join(output_dir, 'test.json'), 'w', encoding='utf-8') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)

    print(f"[OK] Saved train/val/test splits to {output_dir}")


def print_statistics(preprocessor, train_data, val_data, test_data):
    """Print preprocessing statistics"""

    print("\n" + "="*60)
    print("PREPROCESSING STATISTICS")
    print("="*60)

    print(f"\nVocabulary Sizes:")
    print(f"  Chords: {preprocessor.chord_vocab['vocab_size']}")
    print(f"  Genres: {len(preprocessor.genre_vocab)}")
    print(f"  Moods: {len(preprocessor.mood_vocab)}")
    print(f"  Keys: {len(preprocessor.key_vocab)}")
    print(f"  Scale Types: {len(preprocessor.scale_type_vocab)}")

    print(f"\nDataset Splits:")
    print(f"  Train: {len(train_data)} ({len(train_data)/(len(train_data)+len(val_data)+len(test_data))*100:.1f}%)")
    print(f"  Validation: {len(val_data)} ({len(val_data)/(len(train_data)+len(val_data)+len(test_data))*100:.1f}%)")
    print(f"  Test: {len(test_data)} ({len(test_data)/(len(train_data)+len(val_data)+len(test_data))*100:.1f}%)")

    print(f"\nSequence Information:")
    print(f"  Max sequence length: {preprocessor.max_sequence_length}")
    print(f"  Padding token ID: {preprocessor.chord_to_id[preprocessor.PAD_TOKEN]}")

    # Genre distribution in train set
    genre_counts = Counter(item['genre'] for item in train_data)
    print(f"\nGenre Distribution (Train Set):")
    for genre, count in genre_counts.most_common():
        print(f"  {genre}: {count} ({count/len(train_data)*100:.1f}%)")

    print("\n" + "="*60 + "\n")


def main():
    """Main preprocessing pipeline"""

    print("\n" + "="*60)
    print("CHORD PROGRESSION DATA PREPROCESSING PIPELINE")
    print("="*60 + "\n")

    # Paths
    input_file = "../dataset/progressions_final.json"
    output_dir = "../dataset"

    # Load raw data
    print(f"Loading dataset from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    progressions = raw_data['progressions']
    print(f"[OK] Loaded {len(progressions)} progressions")

    # Initialize preprocessor
    preprocessor = ChordProgressionPreprocessor(max_sequence_length=12)

    # Build vocabularies
    preprocessor.build_vocabularies(progressions)

    # Save vocabularies
    preprocessor.save_vocabularies(output_dir)

    # Preprocess dataset
    processed_data = preprocessor.preprocess_dataset(progressions)

    # Split dataset
    train_data, val_data, test_data = split_dataset(
        processed_data,
        train_ratio=0.8,
        val_ratio=0.15,
        test_ratio=0.05,
        seed=42
    )

    # Save splits
    save_split_data(train_data, val_data, test_data, output_dir)

    # Print statistics
    print_statistics(preprocessor, train_data, val_data, test_data)

    # Save preprocessing metadata
    metadata = {
        'preprocessing_date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'total_progressions': len(progressions),
        'train_samples': len(train_data),
        'val_samples': len(val_data),
        'test_samples': len(test_data),
        'max_sequence_length': preprocessor.max_sequence_length,
        'vocab_sizes': {
            'chords': preprocessor.chord_vocab['vocab_size'],
            'genres': len(preprocessor.genre_vocab),
            'moods': len(preprocessor.mood_vocab),
            'keys': len(preprocessor.key_vocab),
            'scale_types': len(preprocessor.scale_type_vocab)
        }
    }

    with open(os.path.join(output_dir, 'preprocessing_metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"[OK] Preprocessing complete! Files saved to {output_dir}")
    print("\nGenerated files:")
    print("  - chord_vocab.json")
    print("  - metadata_vocab.json")
    print("  - train.json")
    print("  - val.json")
    print("  - test.json")
    print("  - preprocessing_metadata.json")


if __name__ == "__main__":
    main()
