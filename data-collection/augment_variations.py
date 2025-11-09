"""
Augment chord progressions by adding chord variations and inversions
"""

import json
import copy
from datetime import datetime
import random


# Chord variation rules
CHORD_VARIATIONS = {
    # Major triads
    '': ['maj7', 'maj9', '6', 'add9', 'sus2', 'sus4'],

    # Minor triads
    'm': ['m7', 'm9', 'm6', 'madd9', 'msus2', 'msus4'],

    # Dominant 7th
    '7': ['9', '13', '7sus4', '7b9', '7#9'],

    # Major 7th
    'maj7': ['maj9', 'maj13', 'maj7#11'],

    # Minor 7th
    'm7': ['m9', 'm11', 'm13'],

    # Diminished
    'dim': ['dim7', 'm7b5'],

    # Augmented
    'aug': ['7#5', 'maj7#5'],
}


def parse_chord(chord):
    """
    Parse a chord into root note and quality
    Returns: (root, quality)
    """
    if len(chord) == 0:
        return None, None

    # Handle flat/sharp notes
    if len(chord) > 1 and chord[1] in ['b', '#']:
        root = chord[:2]
        quality = chord[2:]
    else:
        root = chord[0]
        quality = chord[1:]

    return root, quality


def get_chord_variations(chord, num_variations=2):
    """
    Generate variations for a single chord
    Returns list of varied chords
    """
    root, quality = parse_chord(chord)

    if root is None:
        return [chord]

    variations = [chord]  # Include original

    # Find applicable variations
    if quality in CHORD_VARIATIONS:
        available_variations = CHORD_VARIATIONS[quality]
        # Select random variations
        selected = random.sample(
            available_variations,
            min(num_variations, len(available_variations))
        )
        for var_quality in selected:
            variations.append(root + var_quality)

    return variations


def create_progression_variations(progression, variation_probability=0.5):
    """
    Create variations of a progression by varying some chords
    """
    variations = []

    # Strategy 1: Vary each chord independently with some probability
    varied_progression = []
    for chord in progression:
        if random.random() < variation_probability:
            # Get one variation for this chord
            chord_variations = get_chord_variations(chord, num_variations=1)
            if len(chord_variations) > 1:
                varied_progression.append(chord_variations[1])
            else:
                varied_progression.append(chord)
        else:
            varied_progression.append(chord)

    if varied_progression != progression:
        variations.append(varied_progression)

    # Strategy 2: Vary only first chord
    if len(progression) > 0:
        first_variations = get_chord_variations(progression[0], num_variations=1)
        if len(first_variations) > 1:
            varied = [first_variations[1]] + progression[1:]
            if varied != progression and varied not in variations:
                variations.append(varied)

    # Strategy 3: Vary only last chord
    if len(progression) > 0:
        last_variations = get_chord_variations(progression[-1], num_variations=1)
        if len(last_variations) > 1:
            varied = progression[:-1] + [last_variations[1]]
            if varied != progression and varied not in variations:
                variations.append(varied)

    return variations


def augment_with_variations(input_file, output_file, variations_per_progression=3):
    """
    Augment the dataset by adding chord variations
    """
    print("Loading augmented dataset...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    base_progressions = data['progressions']
    all_progressions = copy.deepcopy(base_progressions)

    print(f"Generating variations for {len(base_progressions)} progressions...")

    progression_id = len(all_progressions) + 1

    variation_count = 0

    for base_prog in base_progressions:
        # Generate variations for this progression
        variations = create_progression_variations(
            base_prog['progression'],
            variation_probability=0.4
        )

        # Add variations to the dataset
        for variation in variations[:variations_per_progression]:
            new_prog = copy.deepcopy(base_prog)
            new_prog['progression'] = variation
            new_prog['id'] = progression_id
            new_prog['source'] = 'variation'
            new_prog['original_id'] = base_prog['id']

            progression_id += 1
            variation_count += 1

            all_progressions.append(new_prog)

    # Create final dataset
    final_data = {
        "progressions": all_progressions,
        "metadata": {
            "version": "1.2",
            "total_progressions": len(all_progressions),
            "base_progressions": len(base_progressions),
            "variations_added": variation_count,
            "augmentation_methods": ["transposition", "chord variations"],
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "description": "Fully augmented chord progression dataset"
        }
    }

    # Save final dataset
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)

    print(f"[OK] Variation augmentation complete!")
    print(f"[OK] Original progressions: {len(base_progressions)}")
    print(f"[OK] Variations added: {variation_count}")
    print(f"[OK] Total progressions: {len(all_progressions)}")
    print(f"[OK] Saved to {output_file}")

    # Print genre distribution
    genres = {}
    for prog in all_progressions:
        genre = prog['genre']
        genres[genre] = genres.get(genre, 0) + 1

    print(f"\nGenre distribution:")
    for genre, count in sorted(genres.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {genre}: {count}")


def main():
    input_file = "../dataset/progressions_augmented.json"
    output_file = "../dataset/progressions_final.json"

    # Set random seed for reproducibility
    random.seed(42)

    augment_with_variations(input_file, output_file, variations_per_progression=2)


if __name__ == "__main__":
    main()
