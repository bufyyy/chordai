"""
Generate base chord progression dataset with popular patterns
"""

import json
from datetime import datetime

# Define base progressions with metadata
BASE_PROGRESSIONS = [
    # Pop Progressions
    {
        "progression": ["C", "G", "Am", "F"],
        "roman_numerals": ["I", "V", "vi", "IV"],
        "key": "C",
        "scale_type": "major",
        "genre": "pop",
        "mood": "uplifting",
        "song_name": "I-V-vi-IV (Axis of Awesome)"
    },
    {
        "progression": ["C", "Am", "F", "G"],
        "roman_numerals": ["I", "vi", "IV", "V"],
        "key": "C",
        "scale_type": "major",
        "genre": "pop",
        "mood": "nostalgic",
        "song_name": "50s Progression"
    },
    {
        "progression": ["Am", "F", "C", "G"],
        "roman_numerals": ["vi", "IV", "I", "V"],
        "key": "C",
        "scale_type": "major",
        "genre": "pop",
        "mood": "melancholic",
        "song_name": "vi-IV-I-V"
    },
    {
        "progression": ["C", "F", "G", "C"],
        "roman_numerals": ["I", "IV", "V", "I"],
        "key": "C",
        "scale_type": "major",
        "genre": "pop",
        "mood": "happy",
        "song_name": "Classic I-IV-V-I"
    },
    {
        "progression": ["C", "Em", "F", "G"],
        "roman_numerals": ["I", "iii", "IV", "V"],
        "key": "C",
        "scale_type": "major",
        "genre": "pop",
        "mood": "bright",
        "song_name": "I-iii-IV-V"
    },
    {
        "progression": ["C", "Dm", "Em", "F"],
        "roman_numerals": ["I", "ii", "iii", "IV"],
        "key": "C",
        "scale_type": "major",
        "genre": "pop",
        "mood": "ascending",
        "song_name": "Ascending Progression"
    },
    {
        "progression": ["C", "G", "F", "C"],
        "roman_numerals": ["I", "V", "IV", "I"],
        "key": "C",
        "scale_type": "major",
        "genre": "pop",
        "mood": "simple",
        "song_name": "Simple I-V-IV-I"
    },

    # Rock Progressions
    {
        "progression": ["C", "F", "G"],
        "roman_numerals": ["I", "IV", "V"],
        "key": "C",
        "scale_type": "major",
        "genre": "rock",
        "mood": "energetic",
        "song_name": "Classic Rock I-IV-V"
    },
    {
        "progression": ["C", "Bb", "F"],
        "roman_numerals": ["I", "bVII", "IV"],
        "key": "C",
        "scale_type": "major",
        "genre": "rock",
        "mood": "powerful",
        "song_name": "I-bVII-IV (Mixolydian)"
    },
    {
        "progression": ["C", "Bb", "Ab", "Bb"],
        "roman_numerals": ["I", "bVII", "bVI", "bVII"],
        "key": "C",
        "scale_type": "major",
        "genre": "rock",
        "mood": "dark",
        "song_name": "I-bVII-bVI-bVII"
    },
    {
        "progression": ["C", "Eb", "Bb", "F"],
        "roman_numerals": ["I", "bIII", "bVII", "IV"],
        "key": "C",
        "scale_type": "major",
        "genre": "rock",
        "mood": "aggressive",
        "song_name": "I-bIII-bVII-IV"
    },
    {
        "progression": ["Am", "G", "F", "E"],
        "roman_numerals": ["i", "VII", "VI", "V"],
        "key": "Am",
        "scale_type": "minor",
        "genre": "rock",
        "mood": "dramatic",
        "song_name": "Minor Rock Progression"
    },

    # Blues Progressions
    {
        "progression": ["C7", "C7", "C7", "C7", "F7", "F7", "C7", "C7", "G7", "F7", "C7", "G7"],
        "roman_numerals": ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"],
        "key": "C",
        "scale_type": "major",
        "genre": "blues",
        "mood": "bluesy",
        "song_name": "12-Bar Blues"
    },
    {
        "progression": ["C7", "F7", "C7", "G7"],
        "roman_numerals": ["I7", "IV7", "I7", "V7"],
        "key": "C",
        "scale_type": "major",
        "genre": "blues",
        "mood": "groovy",
        "song_name": "Simple Blues"
    },
    {
        "progression": ["C7", "F7", "C7", "C7"],
        "roman_numerals": ["I7", "IV7", "I7", "I7"],
        "key": "C",
        "scale_type": "major",
        "genre": "blues",
        "mood": "laid-back",
        "song_name": "Blues Turnaround"
    },

    # Jazz Progressions
    {
        "progression": ["Dm7", "G7", "Cmaj7"],
        "roman_numerals": ["ii7", "V7", "Imaj7"],
        "key": "C",
        "scale_type": "major",
        "genre": "jazz",
        "mood": "sophisticated",
        "song_name": "ii-V-I"
    },
    {
        "progression": ["Cmaj7", "Am7", "Dm7", "G7"],
        "roman_numerals": ["Imaj7", "vi7", "ii7", "V7"],
        "key": "C",
        "scale_type": "major",
        "genre": "jazz",
        "mood": "smooth",
        "song_name": "I-vi-ii-V"
    },
    {
        "progression": ["Cmaj7", "A7", "Dm7", "G7"],
        "roman_numerals": ["Imaj7", "VI7", "ii7", "V7"],
        "key": "C",
        "scale_type": "major",
        "genre": "jazz",
        "mood": "jazzy",
        "song_name": "I-VI-ii-V (Rhythm Changes)"
    },
    {
        "progression": ["Cmaj7", "Dm7", "Em7", "Fmaj7"],
        "roman_numerals": ["Imaj7", "ii7", "iii7", "IVmaj7"],
        "key": "C",
        "scale_type": "major",
        "genre": "jazz",
        "mood": "mellow",
        "song_name": "Diatonic Seventh Ascent"
    },
    {
        "progression": ["Cm7", "Fm7", "Bb7", "Ebmaj7"],
        "roman_numerals": ["ii7", "V7", "I7", "IVmaj7"],
        "key": "Bb",
        "scale_type": "major",
        "genre": "jazz",
        "mood": "minor-jazz",
        "song_name": "Minor ii-V-I"
    },

    # Minor Progressions
    {
        "progression": ["Am", "F", "G", "Am"],
        "roman_numerals": ["i", "VI", "VII", "i"],
        "key": "Am",
        "scale_type": "minor",
        "genre": "pop",
        "mood": "sad",
        "song_name": "i-VI-VII-i"
    },
    {
        "progression": ["Am", "Dm", "E", "Am"],
        "roman_numerals": ["i", "iv", "V", "i"],
        "key": "Am",
        "scale_type": "minor",
        "genre": "classical",
        "mood": "serious",
        "song_name": "Harmonic Minor i-iv-V-i"
    },
    {
        "progression": ["Am", "C", "G", "F"],
        "roman_numerals": ["i", "III", "VII", "VI"],
        "key": "Am",
        "scale_type": "minor",
        "genre": "pop",
        "mood": "emotional",
        "song_name": "i-III-VII-VI"
    },
    {
        "progression": ["Am", "Em", "F", "C"],
        "roman_numerals": ["i", "v", "VI", "III"],
        "key": "Am",
        "scale_type": "minor",
        "genre": "pop",
        "mood": "reflective",
        "song_name": "i-v-VI-III"
    },

    # R&B and Soul
    {
        "progression": ["Cmaj7", "Fmaj7", "Dm7", "G7"],
        "roman_numerals": ["Imaj7", "IVmaj7", "ii7", "V7"],
        "key": "C",
        "scale_type": "major",
        "genre": "rnb",
        "mood": "soulful",
        "song_name": "R&B I-IV-ii-V"
    },
    {
        "progression": ["Am7", "Dm7", "G7", "Cmaj7"],
        "roman_numerals": ["vi7", "ii7", "V7", "Imaj7"],
        "key": "C",
        "scale_type": "major",
        "genre": "rnb",
        "mood": "groovy",
        "song_name": "vi-ii-V-I"
    },

    # EDM/Electronic
    {
        "progression": ["Am", "G", "F", "E"],
        "roman_numerals": ["i", "VII", "VI", "V"],
        "key": "Am",
        "scale_type": "minor",
        "genre": "edm",
        "mood": "energetic",
        "song_name": "EDM Minor Progression"
    },
    {
        "progression": ["C", "Am", "G", "F"],
        "roman_numerals": ["I", "vi", "V", "IV"],
        "key": "C",
        "scale_type": "major",
        "genre": "edm",
        "mood": "uplifting",
        "song_name": "EDM I-vi-V-IV"
    },

    # Extended Progressions
    {
        "progression": ["C", "G", "Am", "Em", "F", "C", "F", "G"],
        "roman_numerals": ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
        "key": "C",
        "scale_type": "major",
        "genre": "pop",
        "mood": "epic",
        "song_name": "8-Chord Pop Progression"
    },
    {
        "progression": ["C", "Dm", "Em", "F", "G", "Am", "Bb", "C"],
        "roman_numerals": ["I", "ii", "iii", "IV", "V", "vi", "bVII", "I"],
        "key": "C",
        "scale_type": "major",
        "genre": "progressive",
        "mood": "journey",
        "song_name": "Ascending Scale Journey"
    },
]


def generate_dataset():
    """Generate the base dataset from predefined progressions"""

    progressions_list = []

    for idx, prog in enumerate(BASE_PROGRESSIONS, start=1):
        progression_data = {
            "id": idx,
            "progression": prog["progression"],
            "roman_numerals": prog["roman_numerals"],
            "key": prog["key"],
            "scale_type": prog["scale_type"],
            "genre": prog["genre"],
            "mood": prog["mood"],
            "song_name": prog["song_name"]
        }
        progressions_list.append(progression_data)

    dataset = {
        "progressions": progressions_list,
        "metadata": {
            "version": "1.0",
            "total_progressions": len(progressions_list),
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "description": "Chord progression dataset for AI training - Base patterns"
        }
    }

    return dataset


def main():
    """Main function to generate and save the dataset"""

    print("Generating base chord progression dataset...")
    dataset = generate_dataset()

    output_path = "../dataset/progressions.json"

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    print(f"[OK] Generated {dataset['metadata']['total_progressions']} base progressions")
    print(f"[OK] Saved to {output_path}")
    print(f"\nGenre distribution:")

    genres = {}
    for prog in dataset['progressions']:
        genre = prog['genre']
        genres[genre] = genres.get(genre, 0) + 1

    for genre, count in sorted(genres.items()):
        print(f"  - {genre}: {count}")


if __name__ == "__main__":
    main()
