"""
Augment chord progressions by transposing them to all 12 keys
"""

import json
import copy
from datetime import datetime


# Chromatic scale for transposition
CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Enharmonic equivalents mapping
ENHARMONIC_MAP = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
}


def parse_chord(chord):
    """
    Parse a chord into root note and quality
    Returns: (root, quality)
    Example: 'Cmaj7' -> ('C', 'maj7'), 'Am' -> ('A', 'm')
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


def transpose_note(note, semitones):
    """
    Transpose a note by a given number of semitones
    """
    # Normalize the note (handle enharmonic equivalents)
    if note in ENHARMONIC_MAP:
        # Use sharp notation for consistency
        if 'b' in note:
            note = ENHARMONIC_MAP[note]

    if note not in CHROMATIC_SCALE:
        # Handle case where note might be in flat notation
        for sharp, flat in ENHARMONIC_MAP.items():
            if note == flat:
                note = sharp
                break

    if note not in CHROMATIC_SCALE:
        return note  # Return as-is if we can't parse it

    current_index = CHROMATIC_SCALE.index(note)
    new_index = (current_index + semitones) % 12
    return CHROMATIC_SCALE[new_index]


def transpose_chord(chord, semitones):
    """
    Transpose a chord by a given number of semitones
    """
    root, quality = parse_chord(chord)

    if root is None:
        return chord

    new_root = transpose_note(root, semitones)
    return new_root + quality


def transpose_progression(progression, semitones):
    """
    Transpose an entire progression
    """
    return [transpose_chord(chord, semitones) for chord in progression]


def transpose_key(key, semitones):
    """
    Transpose a key signature
    """
    # Handle minor keys (e.g., "Am" -> "A" + "m")
    if 'm' in key and len(key) > 1:
        if key[1] == 'm':
            root = key[0]
            suffix = 'm'
        elif len(key) > 2 and key[2] == 'm':
            root = key[:2]
            suffix = 'm'
        else:
            root = key
            suffix = ''
    else:
        root = key
        suffix = ''

    new_root = transpose_note(root, semitones)
    return new_root + suffix


def augment_with_transposition(input_file, output_file):
    """
    Augment the dataset by transposing all progressions to all 12 keys
    """
    print("Loading base dataset...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    base_progressions = data['progressions']
    augmented_progressions = []

    print(f"Transposing {len(base_progressions)} base progressions to all 12 keys...")

    progression_id = 1

    for base_prog in base_progressions:
        # For each base progression, transpose to all 12 keys
        for semitones in range(12):
            # Create a copy of the progression
            new_prog = copy.deepcopy(base_prog)

            # Transpose the progression
            new_prog['progression'] = transpose_progression(base_prog['progression'], semitones)
            new_prog['key'] = transpose_key(base_prog['key'], semitones)

            # Update ID
            new_prog['id'] = progression_id
            progression_id += 1

            # Add metadata about transposition
            if semitones == 0:
                new_prog['source'] = 'original'
            else:
                new_prog['source'] = 'transposed'
                new_prog['transposed_semitones'] = semitones
                new_prog['original_key'] = base_prog['key']

            augmented_progressions.append(new_prog)

    # Create augmented dataset
    augmented_data = {
        "progressions": augmented_progressions,
        "metadata": {
            "version": "1.1",
            "total_progressions": len(augmented_progressions),
            "base_progressions": len(base_progressions),
            "augmentation_method": "transposition to all 12 keys",
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "description": "Augmented chord progression dataset with transpositions"
        }
    }

    # Save augmented dataset
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(augmented_data, f, indent=2, ensure_ascii=False)

    print(f"[OK] Augmented dataset created!")
    print(f"[OK] Original progressions: {len(base_progressions)}")
    print(f"[OK] Transposed progressions: {len(augmented_progressions)}")
    print(f"[OK] Saved to {output_file}")

    # Print some statistics
    keys_distribution = {}
    for prog in augmented_progressions:
        key = prog['key']
        keys_distribution[key] = keys_distribution.get(key, 0) + 1

    print(f"\nKey distribution (top 10):")
    for key, count in sorted(keys_distribution.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  - {key}: {count}")


def main():
    input_file = "../dataset/progressions.json"
    output_file = "../dataset/progressions_augmented.json"

    augment_with_transposition(input_file, output_file)


if __name__ == "__main__":
    main()
