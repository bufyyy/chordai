import { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { getAudioEngine } from '../services/audioEngine';

const ChordPlayer = () => {
  const {
    currentProgression,
    isPlaying,
    tempo,
    currentChordIndex,
    setIsPlaying,
    setTempo,
    setCurrentChordIndex,
  } = useStore();

  const [synthType, setSynthType] = useState('piano');
  const [volume, setVolume] = useState(-6);
  const [isLooping, setIsLooping] = useState(false);
  const [audioEngine, setAudioEngine] = useState(null);

  useEffect(() => {
    const engine = getAudioEngine();
    setAudioEngine(engine);

    // Set up callbacks
    engine.onChordChange = (index) => {
      setCurrentChordIndex(index);
    };

    engine.onPlaybackEnd = () => {
      setIsPlaying(false);
      setCurrentChordIndex(-1);
    };

    return () => {
      engine.stop();
    };
  }, []);

  const handlePlay = async () => {
    if (!audioEngine || !currentProgression || !currentProgression.chords || currentProgression.chords.length === 0) return;

    try {
      setIsPlaying(true);
      await audioEngine.playProgression(currentProgression.chords, tempo, isLooping);
    } catch (error) {
      console.error('Error playing progression:', error);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (audioEngine) {
      audioEngine.stop();
      setIsPlaying(false);
      setCurrentChordIndex(-1);
    }
  };

  const handlePlayChord = async (chord) => {
    if (!audioEngine || isPlaying) return;

    try {
      await audioEngine.playChord(chord, '2n');
    } catch (error) {
      console.error('Error playing chord:', error);
    }
  };

  const handleSynthChange = async (newType) => {
    if (!audioEngine) return;

    try {
      await audioEngine.changeSynthType(newType);
      setSynthType(newType);
    } catch (error) {
      console.error('Error changing synth:', error);
    }
  };

  const handleVolumeChange = (newVolume) => {
    if (!audioEngine) return;
    audioEngine.setVolume(newVolume);
    setVolume(newVolume);
  };

  const handleTempoChange = (newTempo) => {
    if (audioEngine) {
      audioEngine.setTempo(newTempo);
    }
    setTempo(newTempo);
  };

  const handleLoopToggle = () => {
    if (!audioEngine) return;
    const newLoopState = audioEngine.toggleLoop();
    setIsLooping(newLoopState);
  };

  const handleExportMidi = () => {
    if (!audioEngine || !currentProgression || !currentProgression.chords || currentProgression.chords.length === 0) return;

    try {
      const fileName = `progression_${Date.now()}.mid`;
      audioEngine.exportToMidi(currentProgression.chords, fileName);
    } catch (error) {
      console.error('Error exporting MIDI:', error);
      alert('Failed to export MIDI file');
    }
  };

  const synthTypes = [
    { value: 'piano', label: 'Piano', icon: '🎹' },
    { value: 'pad', label: 'Pad', icon: '🌊' },
    { value: 'synth', label: 'Synth', icon: '🎛️' },
    { value: 'electric', label: 'Electric', icon: '⚡' },
  ];

  const chords = currentProgression?.chords || [];
  const hasChords = chords.length > 0;

  return (
    <div className="glass rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 gradient-text">Playback</h2>

      {!hasChords ? (
        <div className="text-center py-8 text-gray-500">
          Generate a progression first to enable playback
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Play Controls */}
          <div className="flex gap-4">
            <button
              onClick={isPlaying ? handleStop : handlePlay}
              className={`flex-1 py-4 rounded-lg font-semibold text-white transition-all duration-300 ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
              } shadow-lg hover:shadow-xl transform hover:scale-105`}
            >
              <div className="flex items-center justify-center">
                {isPlaying ? (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play Progression
                  </>
                )}
              </div>
            </button>

            <button
              onClick={handleLoopToggle}
              className={`px-6 py-4 rounded-lg font-semibold transition-all duration-300 ${
                isLooping
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Toggle loop"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
            </button>
          </div>

          {/* Progress Indicator */}
          {isPlaying && currentChordIndex >= 0 && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-300">
                  Playing chord {currentChordIndex + 1} of {chords.length}
                  {isLooping && ' (Looping)'}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                  style={{
                    width: `${((currentChordIndex + 1) / chords.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Synth Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Instrument
            </label>
            <div className="grid grid-cols-4 gap-2">
              {synthTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleSynthChange(type.value)}
                  disabled={isPlaying}
                  className={`p-3 rounded-lg font-semibold transition-all ${
                    synthType === type.value
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Individual Chord Buttons */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Play Individual Chords:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {chords.map((chord, index) => (
                <button
                  key={index}
                  onClick={() => handlePlayChord(chord)}
                  disabled={isPlaying}
                  className={`px-4 py-3 rounded-lg transition-all font-semibold ${
                    currentChordIndex === index && isPlaying
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/50 scale-105'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {chord.replace('b', '♭').replace('#', '♯')}
                </button>
              ))}
            </div>
          </div>

          {/* Tempo Control */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tempo: <span className="text-green-400">{tempo} BPM</span>
            </label>
            <input
              type="range"
              min="60"
              max="180"
              value={tempo}
              onChange={(e) => handleTempoChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Slow (60)</span>
              <span>Medium (120)</span>
              <span>Fast (180)</span>
            </div>
          </div>

          {/* Volume Control */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Volume: <span className="text-orange-400">{Math.round(((volume + 60) / 60) * 100)}%</span>
            </label>
            <input
              type="range"
              min="-60"
              max="0"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Export MIDI */}
          <button
            onClick={handleExportMidi}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <div className="flex items-center justify-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export as MIDI
            </div>
          </button>

          {/* Info */}
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-300">
              <span className="font-semibold">🎵 Controls:</span> Use individual chord buttons to
              preview, or play the full progression. Loop and export to MIDI available!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChordPlayer;
