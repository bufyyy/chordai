import { useState, useEffect, useCallback } from 'react';
import modelService from '../services/modelService';
import { getAudioEngine } from '../services/audioEngine';
import useStore from '../store/useStore';

/**
 * Adventure A/B test: generates two progressions from the SAME seed chord,
 * genre and section — the only difference is the Adventure slider (0% vs 100%).
 * Plays each side independently so the slider's effect is obvious in seconds.
 *
 * Playback reuses the shared audio engine. We temporarily point its callbacks
 * at local state while the modal is open and restore the store-driven wiring on
 * close, so the main player keeps working afterwards.
 */
const SIDES = {
  safe: {
    key: 'safe',
    adventure: 0,
    title: 'Safe',
    badge: '0%',
    icon: '🛡️',
    desc: 'Low temperature — conservative, predictable picks',
    accent: 'from-blue-600 to-teal-600',
    chip: 'bg-blue-500/15 text-blue-200 border-blue-400/30',
    play: 'from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700',
  },
  experimental: {
    key: 'experimental',
    adventure: 100,
    title: 'Experimental',
    badge: '100%',
    icon: '🔥',
    desc: 'High temperature — bold, surprising picks',
    accent: 'from-orange-600 to-pink-600',
    chip: 'bg-orange-500/15 text-orange-200 border-orange-400/30',
    play: 'from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700',
  },
};

function AdventureCompare() {
  const isOpen = useStore((s) => s.isAbTestOpen);
  const seedChord = useStore((s) => s.abTestSeed);
  const genre = useStore((s) => s.genre);
  const section = useStore((s) => s.section);
  const count = useStore((s) => s.count);
  const octave = useStore((s) => s.octave);
  const tempo = useStore((s) => s.tempo);
  const setAbTestOpen = useStore((s) => s.setAbTestOpen);
  const addToast = useStore((s) => s.addToast);
  const setCurrentChordIndex = useStore((s) => s.setCurrentChordIndex);
  const setIsPlaying = useStore((s) => s.setIsPlaying);

  const [seed, setSeed] = useState(seedChord);
  const [pairs, setPairs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(null); // { side, index }

  const restoreEngine = useCallback(() => {
    const engine = getAudioEngine();
    engine.onChordChange = (i) => setCurrentChordIndex(i);
    engine.onPlaybackEnd = () => {
      setIsPlaying(false);
      setCurrentChordIndex(-1);
    };
  }, [setCurrentChordIndex, setIsPlaying]);

  const generatePair = useCallback(
    async (seedToken) => {
      setLoading(true);
      setPairs(null);
      try {
        const run = async (adventure) => {
          const chords = [seedToken];
          for (let i = 0; i < Math.max(0, count - 1); i++) {
            const { chord } = await modelService.predictNextChord(chords, genre, adventure, section);
            chords.push(chord);
          }
          return chords;
        };
        // Sequential keeps the single TF backend calm; generation is ~tens of ms.
        const safe = await run(SIDES.safe.adventure);
        const experimental = await run(SIDES.experimental.adventure);
        setPairs({ safe, experimental });
      } catch (error) {
        console.error('A/B generation failed:', error);
        addToast({ type: 'error', message: 'Failed to generate comparison. Please try again.' });
      } finally {
        setLoading(false);
      }
    },
    [genre, section, count, addToast]
  );

  // (Re)generate whenever the modal opens with a (possibly new) seed.
  useEffect(() => {
    if (!isOpen) return;
    setSeed(seedChord);
    generatePair(seedChord);
  }, [isOpen, seedChord, generatePair]);

  // Stop playback and restore the store-driven engine wiring on close/unmount.
  useEffect(() => {
    if (!isOpen) return undefined;
    return () => {
      getAudioEngine().stop();
      restoreEngine();
    };
  }, [isOpen, restoreEngine]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    getAudioEngine().stop();
    restoreEngine();
    setPlaying(null);
    setAbTestOpen(false);
  };

  const handleNewSeed = () => {
    const next = modelService.getRandomStartChord(50);
    getAudioEngine().stop();
    setPlaying(null);
    setSeed(next);
    generatePair(next);
  };

  const playSide = async (sideKey, chords) => {
    const engine = getAudioEngine();
    if (playing?.side === sideKey) {
      engine.stop();
      setPlaying(null);
      return;
    }
    engine.stop();
    engine.onChordChange = (i) => setPlaying({ side: sideKey, index: i });
    engine.onPlaybackEnd = () => setPlaying(null);
    setPlaying({ side: sideKey, index: -1 });
    try {
      await engine.playProgression(chords, tempo, false, octave);
    } catch (error) {
      console.error('A/B playback failed:', error);
      setPlaying(null);
      addToast({ type: 'error', message: 'Playback failed — audio samples may not be loaded.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="glass rounded-2xl max-w-3xl w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Adventure A/B Test</h2>
            <p className="text-sm text-gray-400 mt-1">
              Same seed{' '}
              <span className="font-semibold text-white">
                {modelService.formatChordWithSymbols(seed)}
              </span>
              , same genre (<span className="capitalize">{genre}</span>) — only the Adventure slider differs.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleNewSeed}
              disabled={loading}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 transition-colors disabled:opacity-50"
              title="Pick a new random seed chord"
            >
              🔀 New seed
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading || !pairs ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="animate-spin h-8 w-8 mb-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating both progressions…
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {[SIDES.safe, SIDES.experimental].map((side) => {
                const chords = pairs[side.key];
                const isThisPlaying = playing?.side === side.key;
                return (
                  <div
                    key={side.key}
                    data-testid={`ab-side-${side.key}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{side.icon}</span>
                        <span className="font-bold text-white">{side.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${side.chip}`}>
                        Adventure {side.badge}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {chords.map((chord, i) => {
                        const lit = isThisPlaying && playing.index === i;
                        return (
                          <span
                            key={`${chord}-${i}`}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                              lit
                                ? `text-white border-transparent bg-gradient-to-r ${side.accent} scale-110`
                                : 'text-gray-100 border-white/10 bg-gray-800/70'
                            }`}
                          >
                            {modelService.formatChordWithSymbols(chord)}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-auto">
                      <div className="text-xs text-gray-400 mb-2">{side.desc}</div>
                      <button
                        onClick={() => playSide(side.key, chords)}
                        data-testid={`ab-play-${side.key}`}
                        className={`w-full py-2.5 rounded-lg font-semibold text-white text-sm transition-all bg-gradient-to-r ${side.play} shadow-lg`}
                      >
                        {isThisPlaying ? '■ Stop' : '▶ Play'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4 text-center">
            Lower adventure → safer, more repetitive choices. Higher adventure → bolder, more varied chords.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdventureCompare;
