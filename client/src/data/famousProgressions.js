/**
 * Famous chord progressions from well-known songs
 * Library of inspiration for users
 */

export const famousProgressions = [
  // Pop
  {
    id: 'axis-of-awesome',
    name: 'Axis of Awesome (I-V-vi-IV)',
    chords: ['C', 'G', 'Am', 'F'],
    romanNumerals: ['I', 'V', 'vi', 'IV'],
    key: 'C',
    scaleType: 'major',
    genre: 'pop',
    mood: 'uplifting',
    songs: ['Let It Be', 'No Woman No Cry', 'With or Without You', 'Don\'t Stop Believin\''],
  },
  {
    id: 'sensitive-female',
    name: 'Sensitive Female Chord Progression',
    chords: ['C', 'Am', 'F', 'G'],
    romanNumerals: ['I', 'vi', 'IV', 'V'],
    key: 'C',
    scaleType: 'major',
    genre: 'pop',
    mood: 'melancholic',
    songs: ['Someone Like You', 'Grenade', 'All of Me'],
  },
  {
    id: 'vi-IV-I-V',
    name: 'vi-IV-I-V (Alternative)',
    chords: ['Am', 'F', 'C', 'G'],
    romanNumerals: ['vi', 'IV', 'I', 'V'],
    key: 'C',
    scaleType: 'major',
    genre: 'pop',
    mood: 'emotional',
    songs: ['Faded', 'Love Yourself', 'Despacito'],
  },
  {
    id: 'I-vi-IV-V',
    name: '50s Progression (I-vi-IV-V)',
    chords: ['C', 'Am', 'F', 'G'],
    romanNumerals: ['I', 'vi', 'IV', 'V'],
    key: 'C',
    scaleType: 'major',
    genre: 'pop',
    mood: 'nostalgic',
    songs: ['Stand By Me', 'Blue Moon', 'Every Breath You Take'],
  },
  {
    id: 'I-IV-vi-V',
    name: 'I-IV-vi-V',
    chords: ['C', 'F', 'Am', 'G'],
    romanNumerals: ['I', 'IV', 'vi', 'V'],
    key: 'C',
    scaleType: 'major',
    genre: 'pop',
    mood: 'uplifting',
    songs: ['Africa', 'Self Esteem', 'Poker Face'],
  },

  // Rock
  {
    id: 'I-IV-V',
    name: 'I-IV-V (Classic Rock)',
    chords: ['C', 'F', 'G'],
    romanNumerals: ['I', 'IV', 'V'],
    key: 'C',
    scaleType: 'major',
    genre: 'rock',
    mood: 'powerful',
    songs: ['La Bamba', 'Louie Louie', 'Wild Thing'],
  },
  {
    id: 'I-bVII-IV',
    name: 'I-bVII-IV (Mixolydian)',
    chords: ['C', 'Bb', 'F'],
    romanNumerals: ['I', 'bVII', 'IV'],
    key: 'C',
    scaleType: 'major',
    genre: 'rock',
    mood: 'anthemic',
    songs: ['Sweet Child O\' Mine', 'Sweet Home Alabama'],
  },
  {
    id: 'I-bVII-bVI-bVII',
    name: 'I-bVII-bVI-bVII',
    chords: ['C', 'Bb', 'Ab', 'Bb'],
    romanNumerals: ['I', 'bVII', 'bVI', 'bVII'],
    key: 'C',
    scaleType: 'major',
    genre: 'rock',
    mood: 'dark',
    songs: ['Paint It Black', 'Stairway to Heaven (part)'],
  },

  // Blues
  {
    id: '12-bar-blues',
    name: '12-Bar Blues',
    chords: ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'],
    romanNumerals: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    key: 'C',
    scaleType: 'major',
    genre: 'blues',
    mood: 'bluesy',
    songs: ['Crossroads', 'Sweet Home Chicago', 'Johnny B. Goode'],
  },
  {
    id: 'simple-blues',
    name: 'Simple Blues (I-IV-I-V)',
    chords: ['C7', 'F7', 'C7', 'G7'],
    romanNumerals: ['I7', 'IV7', 'I7', 'V7'],
    key: 'C',
    scaleType: 'major',
    genre: 'blues',
    mood: 'bluesy',
    songs: ['Blues classics'],
  },

  // Jazz
  {
    id: 'ii-V-I',
    name: 'ii-V-I (Jazz Turnaround)',
    chords: ['Dm7', 'G7', 'Cmaj7'],
    romanNumerals: ['ii7', 'V7', 'Imaj7'],
    key: 'C',
    scaleType: 'major',
    genre: 'jazz',
    mood: 'sophisticated',
    songs: ['Autumn Leaves', 'All The Things You Are', 'Fly Me To The Moon'],
  },
  {
    id: 'I-vi-ii-V',
    name: 'I-vi-ii-V (Rhythm Changes)',
    chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
    romanNumerals: ['Imaj7', 'vi7', 'ii7', 'V7'],
    key: 'C',
    scaleType: 'major',
    genre: 'jazz',
    mood: 'sophisticated',
    songs: ['I Got Rhythm', 'Anthropology', 'Oleo'],
  },
  {
    id: 'iii-vi-ii-V-I',
    name: 'iii-vi-ii-V-I',
    chords: ['Em7', 'Am7', 'Dm7', 'G7', 'Cmaj7'],
    romanNumerals: ['iii7', 'vi7', 'ii7', 'V7', 'Imaj7'],
    key: 'C',
    scaleType: 'major',
    genre: 'jazz',
    mood: 'smooth',
    songs: ['Satin Doll', 'Take The A Train'],
  },

  // Minor Progressions
  {
    id: 'i-bVII-bVI-V',
    name: 'i-bVII-bVI-V (Andalusian)',
    chords: ['Am', 'G', 'F', 'E'],
    romanNumerals: ['i', 'bVII', 'bVI', 'V'],
    key: 'A',
    scaleType: 'minor',
    genre: 'rock',
    mood: 'dramatic',
    songs: ['Hit The Road Jack', 'Stray Cat Strut'],
  },
  {
    id: 'i-bVI-bVII',
    name: 'i-bVI-bVII',
    chords: ['Am', 'F', 'G'],
    romanNumerals: ['i', 'bVI', 'bVII'],
    key: 'A',
    scaleType: 'minor',
    genre: 'rock',
    mood: 'dark',
    songs: ['All Along The Watchtower', 'Stairway to Heaven'],
  },
  {
    id: 'i-iv-v',
    name: 'i-iv-v (Minor Blues)',
    chords: ['Am', 'Dm', 'Em'],
    romanNumerals: ['i', 'iv', 'v'],
    key: 'A',
    scaleType: 'minor',
    genre: 'blues',
    mood: 'melancholic',
    songs: ['Summertime', 'Black Magic Woman'],
  },
  {
    id: 'i-iv-bVII-bVI',
    name: 'i-iv-bVII-bVI',
    chords: ['Am', 'Dm', 'G', 'F'],
    romanNumerals: ['i', 'iv', 'bVII', 'bVI'],
    key: 'A',
    scaleType: 'minor',
    genre: 'rock',
    mood: 'dark',
    songs: ['Californication', 'Losing My Religion'],
  },

  // R&B/Soul
  {
    id: 'I-iii-IV-V',
    name: 'I-iii-IV-V',
    chords: ['C', 'Em', 'F', 'G'],
    romanNumerals: ['I', 'iii', 'IV', 'V'],
    key: 'C',
    scaleType: 'major',
    genre: 'rnb',
    mood: 'smooth',
    songs: ['Isn\'t She Lovely', 'Just The Two Of Us'],
  },
  {
    id: 'Imaj7-IVmaj7-iii7-vi7',
    name: 'Imaj7-IVmaj7-iii7-vi7',
    chords: ['Cmaj7', 'Fmaj7', 'Em7', 'Am7'],
    romanNumerals: ['Imaj7', 'IVmaj7', 'iii7', 'vi7'],
    key: 'C',
    scaleType: 'major',
    genre: 'rnb',
    mood: 'smooth',
    songs: ['Killing Me Softly', 'Lovely Day'],
  },

  // EDM/Electronic
  {
    id: 'I-V-vi-iii',
    name: 'I-V-vi-iii (EDM)',
    chords: ['C', 'G', 'Am', 'Em'],
    romanNumerals: ['I', 'V', 'vi', 'iii'],
    key: 'C',
    scaleType: 'major',
    genre: 'edm',
    mood: 'energetic',
    songs: ['Levels', 'Wake Me Up', 'Animals'],
  },
  {
    id: 'i-bVI-III-bVII',
    name: 'i-bVI-III-bVII (Epic EDM)',
    chords: ['Am', 'F', 'C', 'G'],
    romanNumerals: ['i', 'bVI', 'III', 'bVII'],
    key: 'A',
    scaleType: 'minor',
    genre: 'edm',
    mood: 'epic',
    songs: ['Clarity', 'Stay', 'This Is What You Came For'],
  },

  // Classical
  {
    id: 'I-IV-I-V-I',
    name: 'I-IV-I-V-I (Authentic Cadence)',
    chords: ['C', 'F', 'C', 'G', 'C'],
    romanNumerals: ['I', 'IV', 'I', 'V', 'I'],
    key: 'C',
    scaleType: 'major',
    genre: 'classical',
    mood: 'resolved',
    songs: ['Classical compositions'],
  },
  {
    id: 'i-iv-i-V-i',
    name: 'i-iv-i-V-i (Minor Authentic)',
    chords: ['Am', 'Dm', 'Am', 'E', 'Am'],
    romanNumerals: ['i', 'iv', 'i', 'V', 'i'],
    key: 'A',
    scaleType: 'minor',
    genre: 'classical',
    mood: 'resolved',
    songs: ['Classical compositions'],
  },

  // Alternative/Indie
  {
    id: 'I-V-IV',
    name: 'I-V-IV (Alternative)',
    chords: ['C', 'G', 'F'],
    romanNumerals: ['I', 'V', 'IV'],
    key: 'C',
    scaleType: 'major',
    genre: 'rock',
    mood: 'raw',
    songs: ['Smells Like Teen Spirit', 'When I Come Around'],
  },
  {
    id: 'I-bIII-bVII-IV',
    name: 'I-bIII-bVII-IV',
    chords: ['C', 'Eb', 'Bb', 'F'],
    romanNumerals: ['I', 'bIII', 'bVII', 'IV'],
    key: 'C',
    scaleType: 'major',
    genre: 'progressive',
    mood: 'mysterious',
    songs: ['Radiohead style progressions'],
  },
];

export const getProgressionsByGenre = (genre) => {
  return famousProgressions.filter((p) => p.genre === genre);
};

export const getProgressionsByMood = (mood) => {
  return famousProgressions.filter((p) => p.mood === mood);
};

export const getProgressionById = (id) => {
  return famousProgressions.find((p) => p.id === id);
};

export const searchProgressions = (query) => {
  const lowerQuery = query.toLowerCase();
  return famousProgressions.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.songs.some((song) => song.toLowerCase().includes(lowerQuery)) ||
      p.genre.toLowerCase().includes(lowerQuery) ||
      p.mood.toLowerCase().includes(lowerQuery),
  );
};
