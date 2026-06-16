/**
 * Presentational 2-octave SVG piano that lights up the notes of the chord
 * currently sounding. `activeMidi` are absolute MIDI numbers (from the audio
 * engine's chordToMidi, so the lit keys match exactly what is played); they are
 * folded into the visible 2-octave window starting at `baseMidi`.
 */
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_SEMITONES = [1, 3, 6, 8, 10];
// Index (within an octave) of the white key each black key sits to the right of.
const BLACK_PRECEDING_WHITE = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
const PITCH_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const OCTAVES = 2;
const SPAN = OCTAVES * 12;

const foldIntoWindow = (midi, baseMidi) => {
  let s = midi - baseMidi;
  while (s >= SPAN) s -= 12;
  while (s < 0) s += 12;
  return s;
};

function PianoKeyboard({ activeMidi = [], baseMidi = 48 }) {
  const active = new Set((activeMidi || []).map((m) => foldIntoWindow(m, baseMidi)));

  const viewW = 280;
  const viewH = 108;
  const whiteCount = OCTAVES * 7;
  const whiteW = viewW / whiteCount;
  const blackW = whiteW * 0.62;
  const blackH = viewH * 0.62;

  const whiteKeys = [];
  const blackKeys = [];
  for (let o = 0; o < OCTAVES; o++) {
    WHITE_SEMITONES.forEach((semi, i) => {
      const semitone = o * 12 + semi;
      whiteKeys.push({
        semitone,
        x: (o * 7 + i) * whiteW,
        active: active.has(semitone),
        pc: (baseMidi + semitone) % 12,
      });
    });
    BLACK_SEMITONES.forEach((bs) => {
      const semitone = o * 12 + bs;
      const precedingWhite = o * 7 + BLACK_PRECEDING_WHITE[bs];
      blackKeys.push({
        semitone,
        x: (precedingWhite + 1) * whiteW - blackW / 2,
        active: active.has(semitone),
      });
    });
  }

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="Chord notes highlighted on a piano keyboard"
    >
      {whiteKeys.map((k) => (
        <g key={`w${k.semitone}`}>
          <rect
            x={k.x + 0.5}
            y={0}
            width={whiteW - 1}
            height={viewH}
            rx={3}
            stroke="#0f172a"
            strokeWidth={1}
            className={`transition-colors duration-150 ${k.active ? 'fill-blue-400' : 'fill-gray-200'}`}
          />
          {k.active && (
            <text
              x={k.x + whiteW / 2}
              y={viewH - 10}
              textAnchor="middle"
              className="fill-white font-semibold"
              style={{ fontSize: 9 }}
            >
              {PITCH_NAMES[k.pc]}
            </text>
          )}
        </g>
      ))}
      {blackKeys.map((k) => (
        <rect
          key={`b${k.semitone}`}
          x={k.x}
          y={0}
          width={blackW}
          height={blackH}
          rx={2}
          className={`transition-colors duration-150 ${k.active ? 'fill-purple-500' : 'fill-gray-900'}`}
        />
      ))}
    </svg>
  );
}

export default PianoKeyboard;
