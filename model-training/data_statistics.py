"""
Detailed Data Statistics and Visualization

Analyzes the preprocessed dataset and generates detailed statistics
"""

import json
from collections import Counter
import os


def load_data(data_dir="../dataset"):
    """Load all dataset files"""

    print("Loading dataset files...")

    with open(os.path.join(data_dir, 'train.json'), 'r', encoding='utf-8') as f:
        train_data = json.load(f)

    with open(os.path.join(data_dir, 'val.json'), 'r', encoding='utf-8') as f:
        val_data = json.load(f)

    with open(os.path.join(data_dir, 'test.json'), 'r', encoding='utf-8') as f:
        test_data = json.load(f)

    with open(os.path.join(data_dir, 'chord_vocab.json'), 'r', encoding='utf-8') as f:
        chord_vocab = json.load(f)

    with open(os.path.join(data_dir, 'metadata_vocab.json'), 'r', encoding='utf-8') as f:
        metadata_vocab = json.load(f)

    print(f"[OK] Loaded train: {len(train_data)}, val: {len(val_data)}, test: {len(test_data)}")

    return train_data, val_data, test_data, chord_vocab, metadata_vocab


def analyze_progression_lengths(data, name="Dataset"):
    """Analyze progression length distribution"""

    lengths = [item['progression_length'] for item in data]
    length_counts = Counter(lengths)

    print(f"\n{name} - Progression Length Distribution:")
    for length, count in sorted(length_counts.items()):
        percentage = (count / len(data)) * 100
        bar = '#' * int(percentage / 2)
        print(f"  {length:2} chords: {count:4} ({percentage:5.1f}%) {bar}")

    print(f"\n  Average length: {sum(lengths) / len(lengths):.2f} chords")
    print(f"  Min length: {min(lengths)}")
    print(f"  Max length: {max(lengths)}")


def analyze_most_common_progressions(data, top_n=10):
    """Find most common chord progressions"""

    # Convert progressions to tuples for counting
    progressions = [tuple(item['progression_original']) for item in data]
    progression_counts = Counter(progressions)

    print(f"\nTop {top_n} Most Common Progressions:")
    for idx, (prog, count) in enumerate(progression_counts.most_common(top_n), 1):
        percentage = (count / len(data)) * 100
        prog_str = ' - '.join(prog)
        print(f"  {idx:2}. [{count:3}x ({percentage:4.1f}%)] {prog_str}")


def analyze_chord_usage(data, chord_vocab, top_n=20):
    """Analyze chord usage frequency"""

    # Get all chords from progressions
    all_chords = []
    for item in data:
        all_chords.extend(item['progression_original'])

    chord_counts = Counter(all_chords)
    total_chords = len(all_chords)

    print(f"\nTop {top_n} Most Used Chords:")
    for idx, (chord, count) in enumerate(chord_counts.most_common(top_n), 1):
        percentage = (count / total_chords) * 100
        bar = '#' * int(percentage * 2)
        print(f"  {idx:2}. {chord:10} {count:4} ({percentage:5.1f}%) {bar}")


def analyze_genre_mood_combinations(data, top_n=15):
    """Analyze genre-mood combinations"""

    combinations = [(item['genre'], item['mood']) for item in data]
    combo_counts = Counter(combinations)

    print(f"\nTop {top_n} Genre-Mood Combinations:")
    for idx, ((genre, mood), count) in enumerate(combo_counts.most_common(top_n), 1):
        percentage = (count / len(data)) * 100
        print(f"  {idx:2}. {genre:12} + {mood:15} = {count:3} ({percentage:4.1f}%)")


def analyze_key_distribution(data):
    """Analyze key distribution"""

    keys = [item['key'] for item in data]
    key_counts = Counter(keys)

    # Separate major and minor keys
    major_keys = {k: v for k, v in key_counts.items() if 'm' not in k or k in ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm']}
    minor_keys = {k: v for k, v in key_counts.items() if 'm' in k}

    print(f"\nKey Distribution:")
    print(f"\n  Major Keys:")
    for key, count in sorted(major_keys.items(), key=lambda x: x[1], reverse=True)[:12]:
        percentage = (count / len(data)) * 100
        bar = '#' * int(percentage)
        print(f"    {key:5} {count:3} ({percentage:4.1f}%) {bar}")

    print(f"\n  Minor Keys:")
    for key, count in sorted(minor_keys.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(data)) * 100
        bar = '#' * int(percentage * 2)
        print(f"    {key:5} {count:3} ({percentage:4.1f}%) {bar}")


def analyze_scale_types(data):
    """Analyze scale type distribution"""

    scale_types = [item['scale_type'] for item in data]
    scale_counts = Counter(scale_types)

    print(f"\nScale Type Distribution:")
    for scale_type, count in scale_counts.most_common():
        percentage = (count / len(data)) * 100
        bar = '#' * int(percentage / 2)
        print(f"  {scale_type:10} {count:4} ({percentage:5.1f}%) {bar}")


def analyze_source_distribution(data):
    """Analyze source distribution (original, transposed, variation)"""

    sources = [item.get('source', 'unknown') for item in data]
    source_counts = Counter(sources)

    print(f"\nSource Distribution:")
    for source, count in source_counts.most_common():
        percentage = (count / len(data)) * 100
        bar = '#' * int(percentage / 2)
        print(f"  {source:15} {count:4} ({percentage:5.1f}%) {bar}")


def print_sample_progressions(data, num_samples=5):
    """Print sample progressions from the dataset"""

    print(f"\nSample Progressions (Random {num_samples}):")

    import random
    samples = random.sample(data, min(num_samples, len(data)))

    for idx, sample in enumerate(samples, 1):
        print(f"\n  [{idx}] {sample['song_name']}")
        print(f"      Progression: {' - '.join(sample['progression_original'])}")
        print(f"      Roman Numerals: {' - '.join(sample['roman_numerals'])}")
        print(f"      Key: {sample['key']} {sample['scale_type']}")
        print(f"      Genre: {sample['genre']}, Mood: {sample['mood']}")
        print(f"      Length: {sample['progression_length']} chords")
        print(f"      Source: {sample['source']}")


def main():
    """Main statistics analysis"""

    print("\n" + "="*70)
    print("DETAILED DATA STATISTICS")
    print("="*70)

    # Load data
    train_data, val_data, test_data, chord_vocab, metadata_vocab = load_data()

    # Combined dataset
    all_data = train_data + val_data + test_data

    print(f"\n{'='*70}")
    print("DATASET OVERVIEW")
    print(f"{'='*70}")
    print(f"\nTotal Samples: {len(all_data)}")
    print(f"  Train: {len(train_data)} ({len(train_data)/len(all_data)*100:.1f}%)")
    print(f"  Validation: {len(val_data)} ({len(val_data)/len(all_data)*100:.1f}%)")
    print(f"  Test: {len(test_data)} ({len(test_data)/len(all_data)*100:.1f}%)")

    print(f"\n{'='*70}")
    print("VOCABULARY STATISTICS")
    print(f"{'='*70}")
    print(f"\nChord Vocabulary Size: {chord_vocab['vocab_size']}")
    print(f"  Special Tokens: {len(chord_vocab['special_tokens'])}")
    print(f"  Unique Chords: {chord_vocab['vocab_size'] - len(chord_vocab['special_tokens'])}")

    print(f"\nMetadata Vocabularies:")
    print(f"  Genres: {len(metadata_vocab['genre_vocab'])}")
    print(f"  Moods: {len(metadata_vocab['mood_vocab'])}")
    print(f"  Keys: {len(metadata_vocab['key_vocab'])}")
    print(f"  Scale Types: {len(metadata_vocab['scale_type_vocab'])}")

    # Progression lengths
    print(f"\n{'='*70}")
    analyze_progression_lengths(train_data, "Training Set")

    # Most common progressions
    print(f"\n{'='*70}")
    analyze_most_common_progressions(train_data, top_n=10)

    # Chord usage
    print(f"\n{'='*70}")
    analyze_chord_usage(train_data, chord_vocab, top_n=25)

    # Genre-mood combinations
    print(f"\n{'='*70}")
    analyze_genre_mood_combinations(train_data, top_n=20)

    # Key distribution
    print(f"\n{'='*70}")
    analyze_key_distribution(train_data)

    # Scale types
    print(f"\n{'='*70}")
    analyze_scale_types(train_data)

    # Source distribution
    print(f"\n{'='*70}")
    analyze_source_distribution(train_data)

    # Sample progressions
    print(f"\n{'='*70}")
    print_sample_progressions(train_data, num_samples=5)

    print(f"\n{'='*70}")
    print("ANALYSIS COMPLETE")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
