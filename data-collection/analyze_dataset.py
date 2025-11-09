"""
Analyze the chord progression dataset and print statistics
"""

import json
from collections import Counter


def analyze_dataset(file_path):
    """Analyze and print dataset statistics"""

    print(f"\n{'='*60}")
    print(f"CHORD PROGRESSION DATASET ANALYSIS")
    print(f"{'='*60}\n")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    progressions = data['progressions']
    metadata = data['metadata']

    # Basic stats
    print(f"Dataset Version: {metadata.get('version', 'N/A')}")
    print(f"Last Updated: {metadata.get('last_updated', 'N/A')}")
    print(f"Total Progressions: {len(progressions)}")
    print(f"\n{'-'*60}\n")

    # Genre distribution
    genres = Counter(p['genre'] for p in progressions)
    print("Genre Distribution:")
    for genre, count in genres.most_common():
        percentage = (count / len(progressions)) * 100
        print(f"  {genre:15} {count:4} ({percentage:.1f}%)")

    # Mood distribution
    moods = Counter(p['mood'] for p in progressions)
    print(f"\n{'-'*60}\n")
    print("Mood Distribution (Top 10):")
    for mood, count in moods.most_common(10):
        percentage = (count / len(progressions)) * 100
        print(f"  {mood:15} {count:4} ({percentage:.1f}%)")

    # Key distribution
    keys = Counter(p['key'] for p in progressions)
    print(f"\n{'-'*60}\n")
    print("Key Distribution:")
    for key, count in keys.most_common():
        percentage = (count / len(progressions)) * 100
        print(f"  {key:5} {count:4} ({percentage:.1f}%)")

    # Scale type distribution
    scale_types = Counter(p['scale_type'] for p in progressions)
    print(f"\n{'-'*60}\n")
    print("Scale Type Distribution:")
    for scale_type, count in scale_types.most_common():
        percentage = (count / len(progressions)) * 100
        print(f"  {scale_type:10} {count:4} ({percentage:.1f}%)")

    # Source distribution (if available)
    if 'source' in progressions[0]:
        sources = Counter(p.get('source', 'unknown') for p in progressions)
        print(f"\n{'-'*60}\n")
        print("Source Distribution:")
        for source, count in sources.most_common():
            percentage = (count / len(progressions)) * 100
            print(f"  {source:15} {count:4} ({percentage:.1f}%)")

    # Progression length distribution
    lengths = Counter(len(p['progression']) for p in progressions)
    print(f"\n{'-'*60}\n")
    print("Progression Length Distribution:")
    for length, count in sorted(lengths.items()):
        percentage = (count / len(progressions)) * 100
        print(f"  {length} chords: {count:4} ({percentage:.1f}%)")

    # Unique chords used
    all_chords = []
    for p in progressions:
        all_chords.extend(p['progression'])

    unique_chords = set(all_chords)
    chord_freq = Counter(all_chords)

    print(f"\n{'-'*60}\n")
    print(f"Total Unique Chords: {len(unique_chords)}")
    print(f"\nTop 20 Most Common Chords:")
    for chord, count in chord_freq.most_common(20):
        percentage = (count / len(all_chords)) * 100
        print(f"  {chord:10} {count:4} ({percentage:.1f}%)")

    print(f"\n{'='*60}\n")


def main():
    import sys

    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "../dataset/progressions_final.json"

    try:
        analyze_dataset(file_path)
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
        print("\nUsage: python analyze_dataset.py [path_to_dataset.json]")
        print("Default: ../dataset/progressions_final.json")


if __name__ == "__main__":
    main()
