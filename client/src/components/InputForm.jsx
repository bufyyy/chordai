import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import modelService from '../services/modelService';
import { SONG_TEMPLATES } from '../constants/songStructure';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const InputForm = () => {
  const {
    genre,
    section,
    adventure,
    octave,
    count,
    isGenerating,
    setGenre,
    setSection,
    setAdventure,
    setOctave,
    setCount,
    setCurrentProgression,
    setDetectedKey,
    setIsGenerating,
    addToast,
    openAbTest,
  } = useStore();

  const [availableGenres, setAvailableGenres] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [startChord, setStartChord] = useState('');
  const [songTemplateId, setSongTemplateId] = useState(SONG_TEMPLATES[0].id);

  const normalizeStartChord = (input) => {
    if (!input) return '';

    const trimmed = input.trim();
    if (!trimmed) return '';

    const first = trimmed.charAt(0).toUpperCase();
    const rest = trimmed.slice(1);
    const normalizedCase = `${first}${rest}`;

    // v3 vocabulary uses "#" natively (e.g., F#, C#), so keep the sharp as typed.
    return normalizedCase;
  };

  // Fetch genres on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        await modelService.loadModel();
        if (modelService.genres && modelService.genres.length > 0) {
          const genres = modelService.genres;
          setAvailableGenres(genres);
          if (!genres.includes(genre) && genres.length > 0) {
            setGenre(genres[0]);
          }
        }
        if (modelService.sections && modelService.sections.length > 0) {
          setAvailableSections(modelService.sections);
        }
      } catch (error) {
        console.error('Failed to load genres:', error);
      }
    };

    fetchGenres();
  }, [setGenre, genre]);

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setCurrentProgression({ chords: [], durations: [] });
    setDetectedKey(null);

    try {
      let currentChords = [];

      // Determine Starting Chord
      // If user provided input, use it. Otherwise, pick random.
      let initialChord = normalizeStartChord(startChord);
      if (!initialChord) {
        initialChord = modelService.getRandomStartChord(adventure);
      }

      // Validate user-provided start chord against the loaded vocabulary.
      if (startChord.trim()) {
        const isValidStartChord = modelService.chords?.includes(initialChord);
        if (!isValidStartChord) {
          addToast({
            type: 'warning',
            message: 'Start chord not found in model vocabulary. Try a simpler chord (e.g., C, Am, G7).',
          });
          setIsGenerating(false);
          return;
        }
      }

      currentChords.push(initialChord);
      let currentDurations = [4];
      // predictions[i] holds the model's candidate list for chords[i]; the seed
      // chord (index 0) wasn't predicted, so its slot stays null.
      let currentPredictions = [null];

      // Update state immediately with the first chord
      setCurrentProgression({
        chords: [...currentChords],
        durations: [...currentDurations],
        predictions: [...currentPredictions],
        metadata: { genre, section, adventure, octave }
      });
      await new Promise(r => setTimeout(r, 100));

      // Generation Loop
      // We already have 1 chord. Generate 'count' MORE? Or 'count' TOTAL?
      // User input usually implies "I want a 4 chord progression".
      // So loop (count - 1) times.
      const loops = Math.max(0, count - 1);

      for (let i = 0; i < loops; i++) {
        const { chord: nextChord, candidates } = await modelService.predictNextChord(
          currentChords, genre, adventure, section
        );
        currentChords.push(nextChord);
        currentDurations.push(4);
        currentPredictions.push(candidates);

        setCurrentProgression({
          chords: [...currentChords],
          durations: [...currentDurations],
          predictions: [...currentPredictions],
          metadata: { genre, section, adventure, octave }
        });

        await new Promise(r => setTimeout(r, 100));
      }

      // Detect Key
      const detectedKey = modelService.detectKey(currentChords);
      setDetectedKey(detectedKey);

    } catch (error) {
      console.error('Error generating progression:', error);
      alert('Failed to generate progression. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate a full multi-section song: each section is produced with its own
  // <SECTION=...> token (showcasing section conditioning), while chord context
  // carries across boundaries so the song flows and stays in one key.
  const handleGenerateSong = async (template) => {
    if (isGenerating || !template) return;

    setIsGenerating(true);
    setCurrentProgression({ chords: [], durations: [] });
    setDetectedKey(null);

    try {
      // Seed chord: validated user input or an adventure-based random pick.
      let seed = normalizeStartChord(startChord);
      if (seed) {
        if (!modelService.chords?.includes(seed)) {
          addToast({
            type: 'warning',
            message: 'Start chord not found in model vocabulary. Try a simpler chord (e.g., C, Am, G7).',
          });
          setIsGenerating(false);
          return;
        }
      } else {
        seed = modelService.getRandomStartChord(adventure);
      }

      const chords = [];
      const durations = [];
      const predictions = [];
      const sections = [];

      const pushUpdate = (sectionName, producedInSection) => {
        setCurrentProgression({
          chords: [...chords],
          durations: [...durations],
          predictions: [...predictions],
          sections: [...sections, { name: sectionName, length: producedInSection }],
          metadata: { genre, adventure, octave, songForm: template.name },
        });
      };

      for (const sec of template.sections) {
        let produced = 0;

        // The very first chord of the whole song is the seed (lives in section 1).
        if (chords.length === 0) {
          chords.push(seed);
          durations.push(4);
          predictions.push(null);
          produced = 1;
          pushUpdate(sec.name, produced);
          await delay(80);
        }

        while (produced < sec.length) {
          const { chord, candidates } = await modelService.predictNextChord(
            chords, genre, adventure, sec.name
          );
          chords.push(chord);
          durations.push(4);
          predictions.push(candidates);
          produced += 1;
          pushUpdate(sec.name, produced);
          await delay(80);
        }

        sections.push({ name: sec.name, length: produced });
      }

      setDetectedKey(modelService.detectKey(chords));
    } catch (error) {
      console.error('Error generating song:', error);
      addToast({ type: 'error', message: 'Failed to generate song. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Open the Adventure A/B test using a fixed seed (validated user input or a
  // random pick) so both compared progressions start from the same chord.
  const handleOpenAbTest = () => {
    let seed = normalizeStartChord(startChord);
    if (seed) {
      if (!modelService.chords?.includes(seed)) {
        addToast({
          type: 'warning',
          message: 'Start chord not found in model vocabulary. Try a simpler chord (e.g., C, Am, G7).',
        });
        return;
      }
    } else {
      seed = modelService.getRandomStartChord(50);
    }
    openAbTest(seed);
  };

  return (
    <div className="glass rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 gradient-text">Create Your Progression</h2>

      <div className="space-y-6">

        {/* Start Chord Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Start Chord <span className="text-xs text-gray-500">(Optional)</span>
          </label>
          <input
            type="text"
            value={startChord}
            onChange={(e) => setStartChord(e.target.value)}
            placeholder="e.g. C, Am, G7 (Empty = Random)"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-600"
            disabled={isGenerating}
          />
        </div>

        {/* Genre & Section Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isGenerating}
            >
              {availableGenres.length > 0 ? (
                availableGenres.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))
              ) : (
                <option>Loading genres...</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isGenerating}
            >
              {availableSections.length > 0 ? (
                availableSections.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))
              ) : (
                <option value="any">Any</option>
              )}
            </select>
          </div>
        </div>

        {/* Adventure Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Adventure: <span className="text-purple-400">{adventure}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={adventure}
            onChange={(e) => setAdventure(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Safe</span>
            <span>Natural</span>
            <span>Experimental</span>
          </div>
          <button
            type="button"
            onClick={handleOpenAbTest}
            disabled={isGenerating}
            data-testid="open-ab-test"
            className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-purple-200 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚖️ A/B Test: hear Safe vs Experimental
          </button>
        </div>

        {/* Count & Octave */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Count</label>
            <input
              type="number"
              min="1"
              max="16"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Octave</label>
            <input
              type="number"
              min="1"
              max="7"
              value={octave}
              onChange={(e) => setOctave(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all duration-300 ${isGenerating
            ? 'bg-gray-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </div>
          ) : (
            'Generate Progression'
          )}
        </button>

        {/* Full Song Builder */}
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-purple-200">🎵 Build a Full Song</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Generates a complete structure — each section conditioned on its own type.
          </p>
          <div className="flex gap-2">
            <select
              value={songTemplateId}
              onChange={(e) => setSongTemplateId(e.target.value)}
              disabled={isGenerating}
              aria-label="Song structure template"
              className="flex-1 min-w-0 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            >
              {SONG_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleGenerateSong(SONG_TEMPLATES.find((t) => t.id === songTemplateId))}
              disabled={isGenerating}
              data-testid="generate-song"
              className={`shrink-0 px-4 py-2.5 rounded-lg font-semibold text-white text-sm transition-all duration-300 ${
                isGenerating
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
              }`}
            >
              Generate Song
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            {SONG_TEMPLATES.find((t) => t.id === songTemplateId)?.summary}
          </p>
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <span className="font-semibold">💡 Tip:</span> Use the Adventure slider to control how unpredictable the AI should be.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InputForm;
