/**
 * Song-structure presets and section styling.
 *
 * Each template is an ordered list of sections; the generator produces every
 * section conditioned on its own <SECTION=...> token (the model's main
 * contribution) while carrying chord context across boundaries so the song
 * flows and stays in a coherent key. Section names must exist in the model
 * vocabulary (intro, verse, chorus, bridge, outro, other, any).
 */
export const SONG_TEMPLATES = [
  {
    id: 'pop',
    name: 'Pop Song',
    summary: 'Intro · Verse · Chorus · Bridge · Chorus · Outro',
    sections: [
      { name: 'intro', length: 2 },
      { name: 'verse', length: 4 },
      { name: 'chorus', length: 4 },
      { name: 'bridge', length: 2 },
      { name: 'chorus', length: 4 },
      { name: 'outro', length: 2 },
    ],
  },
  {
    id: 'verse-chorus',
    name: 'Verse / Chorus',
    summary: 'Verse · Chorus · Verse · Chorus',
    sections: [
      { name: 'verse', length: 4 },
      { name: 'chorus', length: 4 },
      { name: 'verse', length: 4 },
      { name: 'chorus', length: 4 },
    ],
  },
  {
    id: 'ballad',
    name: 'Ballad',
    summary: 'Intro · Verse · Chorus · Bridge · Outro',
    sections: [
      { name: 'intro', length: 2 },
      { name: 'verse', length: 4 },
      { name: 'chorus', length: 4 },
      { name: 'bridge', length: 2 },
      { name: 'outro', length: 2 },
    ],
  },
];

const SECTION_STYLES = {
  intro: { label: 'Intro', pill: 'bg-teal-500/20 text-teal-300 border-teal-400/30' },
  verse: { label: 'Verse', pill: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
  chorus: { label: 'Chorus', pill: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
  bridge: { label: 'Bridge', pill: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
  outro: { label: 'Outro', pill: 'bg-teal-500/20 text-teal-300 border-teal-400/30' },
  other: { label: 'Section', pill: 'bg-gray-500/20 text-gray-300 border-gray-400/30' },
  any: { label: 'Any', pill: 'bg-gray-500/20 text-gray-300 border-gray-400/30' },
};

export const sectionStyle = (name) =>
  SECTION_STYLES[name] || SECTION_STYLES.other;

/**
 * Expand a sections array ([{ name, length }]) into a per-chord name list,
 * so the display/player can look up which section a chord index belongs to.
 */
export const sectionNameByIndex = (sections, chordCount) => {
  const result = new Array(chordCount).fill(null);
  if (!Array.isArray(sections)) return result;
  let cursor = 0;
  for (const section of sections) {
    const len = Number(section?.length) || 0;
    for (let i = 0; i < len && cursor < chordCount; i++, cursor++) {
      result[cursor] = section.name;
    }
  }
  return result;
};
