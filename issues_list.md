Codebase Issues
Bugs (Broken Functionality)
1. Shared URL progression never loads into the app App.jsx lines 62-83: The ?p= URL parameter is decoded via decodeProgressionFromUrl(), but the decoded progression object is never passed to setCurrentProgression(). The user sees a "Loaded shared progression!" toast, but nothing actually loads on screen. (Done)

2. Space shortcut only toggles store state, doesn't start/stop audio App.jsx line 36: The Space key shortcut calls setIsPlaying(!isPlaying) which toggles the Zustand state, but it never calls audioEngine.playProgression() or audioEngine.stop(). The UI indicator changes but no audio plays/stops. (Done)

3. History saves with wrong field names — metadata is always empty ProgressionDisplay.jsx line 62-67 calls saveToHistory({ chords, genre, detectedKey, octave }), but storage.js line 23-31 expects progression.key (not detectedKey) and progression.mood, progression.scaleType. Result: history entries are saved with key: undefined, mood: undefined, scaleType: undefined. (Done)

4. ChordPlayer uses raw vocab tokens for individual chord display ChordPlayer.jsx line 239: chord.replace('b', '♭').replace('#', '♯') operates on raw vocab tokens (e.g., "Fs") without first calling formatChordForDisplay(). So "Fs" stays as "Fs" instead of showing "F♯". (Done)

5. ChordPlayer doesn't use the octave from the progression audioEngine.js line 284: playProgression hardcodes octave 4 inside the sequence callback, ignoring the user's selected octave from currentProgression.metadata.octave. (Done)

6. ProgressionDisplay chord display replaces only first b/# ProgressionDisplay.jsx line 26: .replace('b', '♭').replace('#', '♯') only replaces the first occurrence. A chord like "Bb" correctly becomes "B♭", but "Bbb" (double flat) or a chord with b in the quality part (e.g., "m7b5") would get incorrectly replaced. The b in Bb happens to be the first character after root, but Ab7 would replace the b in Ab correctly only by luck. (Done)

7. HistoryPanel / FavoritesPanel don't refresh when sidebar opens Both panels load data only once on mount (useEffect([], [])). If the user generates a new progression and then opens the sidebar, the new history/favorite won't appear until they close and re-mount the sidebar. (Done)

8. Duplicate quality === '9' condition in audioEngine.js audioEngine.js line 191 matches quality === '9' to maj9 intervals [0, 4, 7, 11, 14], but line 209 also matches quality === '9' to dom9 intervals [0, 4, 7, 10, 14]. The second branch is unreachable — 9 chords always get treated as maj9 instead of dom9. (Done)

Incomplete Features
9. Settings defaultTempo is never applied on app load Settings.jsx lets users set a defaultTempo, and storage.js persists it, but ChordPlayer always initializes with the Zustand default of 120 BPM. The saved setting is never read and applied. (Done)

10. Settings autoSaveHistory toggle has no effect The checkbox is saved in localStorage, but ProgressionDisplay.jsx always auto-saves to history on every progression change (line 61-72) without checking this setting. (Done)

11. Settings audioQuality has no effect Three quality options (High/Medium/Low) are offered in Settings but no code in audioEngine.js or anywhere else reads or acts on this value. (Done)

12. Demo Mode is unreachable App.jsx line 29 checks model === 'DEMO_MODE' but nothing in the codebase ever sets the model to this string. The demo mode banner and fallback logic are dead code. (Done)

13. exportAsPdf exports a PNG, not a PDF exportUtils.js line 303-397: The function creates a canvas and downloads it as a .png file, not an actual PDF. (Done)

Architecture / Code Quality Issues
14. Tutorial text mentions non-existent shortcut R for regenerate Tutorial.jsx line 74: Says "R (regenerate)" but no such shortcut is registered in App.jsx. (Done)

15. Tutorial text mentions outdated parameters Tutorial.jsx line 38: Says "Select genre, mood, key, and scale type" but the current InputForm uses genre, adventure, count, and octave. Mood, key, and scale type are no longer user inputs. (Done)

16. Footer "How it works" text is outdated App.jsx line 242: Says "Select genre, mood, key, and other parameters" — same outdated reference to mood and key. (Done)

17. ProgressionLibrary filter logic conflict ProgressionLibrary.jsx lines 14-26: When both a genre filter AND search query are active, the search runs on the full famousProgressions array (not the genre-filtered results), effectively ignoring the genre filter.

18. useKeyboardShortcuts re-registers listeners every render App.jsx passes a new inline array to useKeyboardShortcuts on every render. Since the dependency is [shortcuts] and the array reference changes each render, the event listener is torn down and re-added on every render cycle.

19. FavoritesPanel hardcodes localStorage key FavoritesPanel.jsx line 59: Directly uses localStorage.setItem('chordai_favorites', ...) instead of using the STORAGE_KEYS constant from storage.js, making it fragile if the key name ever changes.

20. Excessive console.log debug output in production modelService.js has ~30 console.log('[DEBUG]') statements that run on every prediction, cluttering the browser console in production.

21. ModelLoader retry button passes wrong argument ModelLoader.jsx line 128: onClick={loadModel} calls the function without the isCancelled flag, which defaults to false, so it works — but the function signature expects it as a parameter and doesn't re-clear the modelError state before retrying.

22. ModelLoader progress jumps are not granular ModelLoader.jsx lines 50-56: Progress goes 0 → 20 → 90 → 100 with no intermediate steps. The "Loading vocabularies" stage (50%) is never shown because progress skips from 20 directly to 90.

23. No input validation on start chord InputForm.jsx line 61-63: User-typed start chords are passed directly to the model. If the chord doesn't exist in the vocabulary, it silently maps to PAD_ID, which can produce poor predictions.

24. modelService.detectKey is overly simplistic modelService.js lines 286-300: Key detection only looks at the first chord and checks if it contains m. A chord like Cm7 → "C Minor" is correct, but Cmaj7 also contains m in maj, though the regex !firstChord.includes('maj') handles that. More importantly, a 4-chord progression's key should be detected from all chords, not just the first one.