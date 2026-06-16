import { useState, useEffect, useMemo, useCallback } from 'react';
import useStore from '../store/useStore';
import { saveToHistory, saveToFavorites, isInFavorites, removeFromFavorites } from '../utils/storage';
import { getSettings } from '../utils/storage';
import { exportAsPdf } from '../utils/exportUtils';
import modelService from '../services/modelService';
import ChordPicker from './ChordPicker';
import { sectionStyle, sectionNameByIndex } from '../constants/songStructure';

const EMPTY_CHORDS = [];

/**
 * "Model's brain" panel: shows the top candidates the model weighed for this
 * slot, with the actually-sampled chord highlighted. Bars are scaled relative
 * to the strongest candidate for visual punch; the % text is the real value.
 */
const ChordInsights = ({ candidates, chosen }) => {
  if (!candidates?.length) return null;
  const sorted = [...candidates].sort((a, b) => b.prob - a.prob).slice(0, 5);
  const max = Math.max(...sorted.map((c) => c.prob), 1e-6);

  return (
    <div
      className="mt-3 pt-3 border-t border-white/10 text-left"
      onClick={(e) => e.stopPropagation()}
      data-testid="chord-insights"
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-purple-300/80 mb-2 font-semibold">
        <span aria-hidden="true">🧠</span> Model considered
      </div>
      <div className="space-y-1.5">
        {sorted.map(({ token, prob }) => {
          const isChosen = token === chosen;
          return (
            <div key={token} className="flex items-center gap-2">
              <span
                className={`w-12 shrink-0 text-[11px] font-semibold truncate ${
                  isChosen ? 'text-white' : 'text-gray-400'
                }`}
              >
                {modelService.formatChordWithSymbols(token)}
              </span>
              <div className="flex-1 h-2 rounded-full bg-gray-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isChosen
                      ? 'bg-gradient-to-r from-blue-400 to-purple-500'
                      : 'bg-gray-500/80'
                  }`}
                  style={{ width: `${Math.max(6, (prob / max) * 100)}%` }}
                />
              </div>
              <span
                className={`w-9 shrink-0 text-right text-[10px] tabular-nums ${
                  isChosen ? 'text-purple-200 font-semibold' : 'text-gray-500'
                }`}
              >
                {Math.round(prob * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChordCard = ({
  chord,
  index,
  octave,
  isPlaying,
  onCardClick,
  romanNumeral,
  beats = 4,
  onDecreaseBeats,
  onIncreaseBeats,
  disableDurationControls = false,
  candidates = null,
  showInsights = false,
  sectionName = null,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const section = sectionName ? sectionStyle(sectionName) : null;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        role={onCardClick ? 'button' : undefined}
        tabIndex={onCardClick ? 0 : undefined}
        onClick={onCardClick}
        onKeyDown={
          onCardClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCardClick();
                }
              }
            : undefined
        }
        className={`glass rounded-xl p-6 transition-all duration-300 ${onCardClick ? 'cursor-pointer' : ''
          } ${isPlaying
          ? 'ring-4 ring-blue-500 shadow-2xl scale-105'
          : 'hover:scale-105 glass-hover'
          }`}
      >
        {/* Chord Index + section tag */}
        <div className="flex items-center gap-2 mb-2" data-testid={`chord-card-label-${index}`}>
          {section && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${section.pill}`}>
              {section.label}
            </span>
          )}
          <span className="text-xs text-gray-500">Chord {index + 1}</span>
        </div>

        {/* Chord Name + Octave */}
        <div className="text-3xl font-bold text-white mb-2">
          {modelService.formatChordWithSymbols(chord)}
          <span className="text-xl text-gray-400">{octave}</span>
        </div>

        {romanNumeral ? (
          <div className="text-sm text-purple-300 font-semibold tracking-wide">{romanNumeral}</div>
        ) : null}

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecreaseBeats?.();
            }}
            disabled={disableDurationControls || beats <= 1}
            data-testid={`duration-minus-${index}`}
            title="Decrease beats"
            className="w-7 h-7 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span
            className="text-xs text-blue-200 min-w-[72px] text-center font-semibold"
            data-testid={`duration-value-${index}`}
          >
            {beats} beat{beats === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIncreaseBeats?.();
            }}
            disabled={disableDurationControls || beats >= 8}
            data-testid={`duration-plus-${index}`}
            title="Increase beats"
            className="w-7 h-7 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>

        {showInsights && (
          candidates?.length ? (
            <ChordInsights candidates={candidates} chosen={chord} />
          ) : (
            <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-gray-500 text-left">
              🌱 Seed chord — not model-predicted.
            </div>
          )
        )}
      </div>
    </div>
  );
};

const ProgressionDisplay = () => {
  const {
    currentProgression,
    detectedKey,
    currentChordIndex,
    isGenerating,
    isPlaying,
    mood,
    addChord,
    removeChord,
    setChordDuration,
    replaceChord,
    transposeProgression,
  } = useStore();

  const [isFavorite, setIsFavorite] = useState(false);
  const [progressionId, setProgressionId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [pickerState, setPickerState] = useState(null);
  const [showRomanNumerals, setShowRomanNumerals] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const chords = currentProgression?.chords ?? EMPTY_CHORDS;
  const predictions = currentProgression?.predictions;
  // Insights only exist for a fresh AI generation; structural edits clear them.
  const hasInsights = Array.isArray(predictions) && predictions.some(Boolean);

  // Song-structure metadata (present only for full-song generations).
  const songSections = currentProgression?.sections;
  const sectionForIndex = useMemo(
    () => sectionNameByIndex(songSections, chords.length),
    [songSections, chords.length]
  );
  const hasSongStructure = Array.isArray(songSections) && songSections.length > 0;
  const durations = useMemo(
    () => (currentProgression?.durations?.length ? currentProgression.durations : chords.map(() => 4)),
    [chords, currentProgression?.durations]
  );
  const metadata = currentProgression?.metadata || {};
  const { genre, octave } = metadata;

  const resolvedRomanNumerals = useMemo(() => {
    if (!chords.length || !detectedKey) return null;
    const preset = currentProgression?.romanNumerals;
    if (preset && preset.length === chords.length) return preset;
    return modelService.chordsToRomanNumerals(chords, detectedKey);
  }, [chords, currentProgression?.romanNumerals, detectedKey]);

  // Check if current progression is favorited
  useEffect(() => {
    if (chords.length > 0 && progressionId) {
      setIsFavorite(isInFavorites(progressionId));
    }
  }, [chords, progressionId]);

  // Auto-save to history when progression changes
  useEffect(() => {
    const { autoSaveHistory } = getSettings();
    if (!autoSaveHistory) return;

    // Avoid saving incomplete entries while the key hasn't been detected yet.
    if (chords.length > 0 && detectedKey) {
      const scaleType = detectedKey.toLowerCase().includes('minor') ? 'minor' : 'major';
      const entry = saveToHistory({
        chords: chords,
        durations,
        genre,
        mood,
        key: detectedKey,
        scaleType,
        octave,
        section: metadata.section,
      });
      if (entry) {
        setProgressionId(entry.id);
      }
    }
  }, [chords, durations, genre, detectedKey, mood, octave, metadata.section]);

  const handleCopyProgression = () => {
    const text = chords.map(c => modelService.formatChordForDisplay(c) + (octave ?? '')).join(' - ');
    navigator.clipboard.writeText(text);
    showToastNotification('Copied to clipboard!');
  };

  const handleExportPdf = () => {
    exportAsPdf({
      chords,
      metadata,
      romanNumerals: currentProgression?.romanNumerals,
    });
    showToastNotification('PDF exported!');
  };

  const handleChordReplace = useCallback((index, newChord) => {
    replaceChord(index, newChord);
    showToastNotification('Chord updated');
  }, [replaceChord]);

  const handleChordAdd = useCallback((index, newChord) => {
    addChord(index, newChord);
    showToastNotification('Chord added');
  }, [addChord]);

  const handleChordRemove = useCallback((index) => {
    if (chords.length <= 1) return;
    removeChord(index);
    showToastNotification('Chord removed');
  }, [chords.length, removeChord]);

  const handleDurationChange = useCallback(
    (index, delta) => {
      const currentBeats = durations[index] ?? 4;
      const nextBeats = Math.max(1, Math.min(8, currentBeats + delta));
      if (nextBeats === currentBeats) return;
      setChordDuration(index, nextBeats);
    },
    [durations, setChordDuration]
  );

  const handleCardClick = useCallback((index) => {
    if (isGenerating || isPlaying) return;
    setPickerState({ mode: 'replace', index });
  }, [isGenerating, isPlaying]);

  const handleAddClick = useCallback((index) => {
    if (isGenerating || isPlaying) return;
    setPickerState({ mode: 'add', index });
  }, [isGenerating, isPlaying]);

  const handlePickerCancel = useCallback(() => {
    setPickerState(null);
  }, []);

  const handlePickerSelect = useCallback((raw) => {
    if (!pickerState) return;

    if (pickerState.mode === 'add') {
      handleChordAdd(pickerState.index, raw);
    } else {
      handleChordReplace(pickerState.index, raw);
    }
    setPickerState(null);
  }, [pickerState, handleChordAdd, handleChordReplace]);

  const handleTranspose = (semitones) => {
    transposeProgression(semitones);
    showToastNotification(`Transposed ${semitones > 0 ? '+' : ''}${semitones} semitone${Math.abs(semitones) === 1 ? '' : 's'}`);
  };

  const handleToggleFavorite = () => {
    if (!progressionId) return;

    if (isFavorite) {
      // Remove from favorites
      if (removeFromFavorites(progressionId)) {
        setIsFavorite(false);
        showToastNotification('Removed from favorites');
      }
    } else {
      // Add to favorites
      const result = saveToFavorites({
        id: progressionId,
        chords: chords,
        durations,
        metadata: {
          genre,
          mood,
          key: detectedKey,
          scaleType: detectedKey?.toLowerCase().includes('minor') ? 'minor' : 'major',
          octave,
          section: metadata.section,
        },
      });
      if (result) {
        setIsFavorite(true);
        showToastNotification('Added to favorites!');
      }
    }
  };

  const showToastNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (chords.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 shadow-xl text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-400 mb-2">No progression yet</h3>
        <p className="text-gray-500">
          Select your preferences and click "Generate Progression" to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-xl relative z-20 overflow-visible">
      {/* Toast Notification */}
      {showToast && (
        <div className="absolute top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold gradient-text">Your Progression</h2>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${isFavorite
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              className="w-5 h-5"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>

          <button
            onClick={handleCopyProgression}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
            title="Copy to clipboard"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
            title="Export as PDF"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 16v-8m0 8l-3-3m3 3l3-3M4 20h16"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setShowRomanNumerals((v) => !v)}
            aria-pressed={showRomanNumerals}
            className={`shrink-0 px-3 py-2 rounded-lg transition-colors text-sm font-semibold whitespace-nowrap border ${
              showRomanNumerals
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400'
                : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'
            }`}
            title={
              showRomanNumerals
                ? 'Show chord symbol names on cards'
                : 'Show roman numerals (relative to detected key)'
            }
          >
            {showRomanNumerals ? 'Letters' : 'Roman #'}
          </button>

          {hasInsights && (
            <button
              type="button"
              onClick={() => setShowInsights((v) => !v)}
              aria-pressed={showInsights}
              data-testid="toggle-insights"
              className={`shrink-0 px-3 py-2 rounded-lg transition-colors text-sm font-semibold whitespace-nowrap border ${
                showInsights
                  ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400'
                  : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'
              }`}
              title={
                showInsights
                  ? 'Hide the model\'s candidate probabilities'
                  : 'Show what the AI considered for each chord'
              }
            >
              {showInsights ? '🧠 Hide AI' : '🧠 AI Insights'}
            </button>
          )}
        </div>
      </div>

      {/* Song form summary */}
      {hasSongStructure && (
        <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="song-form">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Song form</span>
          {songSections.map((s, i) => {
            const style = sectionStyle(s.name);
            return (
              <span
                key={`${s.name}-${i}`}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${style.pill}`}
              >
                {style.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Chord Cards */}
      <p className="text-xs text-gray-500 mb-3">
        {isGenerating
          ? 'Generating... chord editing is temporarily disabled.'
          : 'Click a chord card to replace it, use + to insert chords, and × to remove chords.'}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 overflow-visible">
        {chords.map((chord, index) => (
          <div
            key={currentProgression?.chordItemIds?.[index] || `${chord}-${index}`}
            data-testid={`chord-card-${index}`}
            className="relative min-h-[140px] overflow-visible"
          >
            <ChordCard
              chord={chord}
              index={index}
              octave={octave}
              isPlaying={index === currentChordIndex}
              onCardClick={!isGenerating && !isPlaying ? () => handleCardClick(index) : undefined}
              beats={durations[index] ?? 4}
              onDecreaseBeats={() => handleDurationChange(index, -1)}
              onIncreaseBeats={() => handleDurationChange(index, 1)}
              disableDurationControls={isGenerating || isPlaying}
              romanNumeral={
                showRomanNumerals && resolvedRomanNumerals?.[index]
                  ? resolvedRomanNumerals[index]
                  : null
              }
              candidates={predictions?.[index] ?? null}
              showInsights={showInsights}
              sectionName={sectionForIndex[index]}
            />
            {chords.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChordRemove(index);
                }}
                disabled={isGenerating || isPlaying}
                title="Remove chord"
                data-testid={`remove-chord-${index}`}
                className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ×
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddClick(index + 1);
              }}
              disabled={isGenerating || isPlaying}
              title={`Add chord after ${index + 1}`}
              data-testid={`add-chord-after-${index}`}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>

            {pickerState?.mode === 'replace' && pickerState.index === index && (
              <ChordPicker
                mode="replace"
                onSelect={handlePickerSelect}
                onCancel={handlePickerCancel}
              />
            )}
            {pickerState?.mode === 'add' && pickerState.index === index + 1 && (
              <ChordPicker
                mode="add"
                onSelect={handlePickerSelect}
                onCancel={handlePickerCancel}
              />
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => handleAddClick(chords.length)}
          disabled={isGenerating || isPlaying}
          title="Add chord at end"
          data-testid="add-chord-end"
          className="min-h-[140px] rounded-xl border-2 border-dashed border-blue-400/60 text-blue-300 hover:text-white hover:border-blue-300 hover:bg-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <span className="text-3xl leading-none">+</span>
            <span className="text-xs font-semibold tracking-wide uppercase">Add Chord</span>
          </div>
        </button>
      </div>

      {/* Progression Info */}
      <div className="flex flex-wrap gap-4 text-sm">
        {/* Detected Key Badge */}
        <div className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-lg animate-pulse-slow">
          <span className="text-white/80 mr-2">Detected Key:</span>
          <span className="text-white font-bold text-lg">
            {detectedKey || 'Analyzing...'}
          </span>
        </div>

        <div className="px-4 py-2 bg-gray-800 rounded-lg flex items-center">
          <span className="text-gray-400 mr-2">Genre:</span>
          <span className="text-white font-semibold capitalize">{genre}</span>
        </div>

        <div className="px-4 py-2 bg-gray-800 rounded-lg flex items-center">
          <span className="text-gray-400 mr-2">Length:</span>
          <span className="text-white font-semibold">{chords.length} chords</span>
        </div>

        <div className="flex items-center gap-2 px-2 py-1">
          <button
            type="button"
            onClick={() => handleTranspose(-1)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-bold min-w-[44px]"
            title="Transpose down one semitone"
          >
            −
          </button>
          <span className="text-sm text-gray-300 whitespace-nowrap">Transpose</span>
          <button
            type="button"
            onClick={() => handleTranspose(1)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-bold min-w-[44px]"
            title="Transpose up one semitone"
          >
            +
          </button>
        </div>
      </div>

      {/* Progression as text */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <div className="text-gray-400 text-sm mb-2">Progression notation:</div>
        <div className="text-white font-mono text-lg">
          {showRomanNumerals && resolvedRomanNumerals?.length
            ? resolvedRomanNumerals.join(' → ')
            : chords.map((c) => modelService.formatChordForDisplay(c) + (octave ?? '')).join(' → ')}
        </div>
      </div>
    </div>
  );
};

export default ProgressionDisplay;
