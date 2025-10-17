import { useEffect } from 'react';
import ModelLoader from './components/ModelLoader';
import InputForm from './components/InputForm';
import ProgressionDisplay from './components/ProgressionDisplay';
import ChordPlayer from './components/ChordPlayer';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Tutorial from './components/Tutorial';
import Settings from './components/Settings';
import ProgressionLibrary from './components/ProgressionLibrary';
import useStore from './store/useStore';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

function App() {
  const {
    isModelLoading,
    model,
    isSettingsOpen,
    isLibraryOpen,
    setSettingsOpen,
    setLibraryOpen,
    addToast,
    isPlaying,
    setIsPlaying,
  } = useStore();

  const isDemoMode = model === 'DEMO_MODE';

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: ' ',
      action: () => {
        setIsPlaying(!isPlaying);
      },
    },
    {
      key: 'l',
      action: () => {
        setLibraryOpen(true);
      },
    },
    {
      key: 's',
      ctrl: true,
      action: () => {
        setSettingsOpen(true);
      },
    },
    {
      key: 'escape',
      action: () => {
        setSettingsOpen(false);
        setLibraryOpen(false);
      },
    },
  ]);

  // Check for shared progression in URL
  useEffect(() => {
    const checkSharedProgression = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('p')) {
        try {
          const { decodeProgressionFromUrl } = await import('./utils/exportUtils');
          const progression = decodeProgressionFromUrl();

          if (progression) {
            addToast({
              type: 'success',
              message: 'Loaded shared progression!',
            });
          }
        } catch (error) {
          console.error('Failed to load shared progression:', error);
        }
      }
    };

    checkSharedProgression();
  }, [addToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && !isModelLoading && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glass px-6 py-3 rounded-full border-2 border-yellow-500/50 animate-fade-in">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-yellow-300">
                Demo Mode - Using mock progressions
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Global Components */}
      <Toast />
      <Tutorial />
      <Settings isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProgressionLibrary isOpen={isLibraryOpen} onClose={() => setLibraryOpen(false)} />

      {/* Model Loader */}
      <ModelLoader />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Top Actions */}
            <div className="flex justify-end gap-3 mb-4">
              <button
                onClick={() => setLibraryOpen(true)}
                className="px-4 py-2 glass hover:bg-white/15 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 group"
                title="Library (L)"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                Library
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="px-4 py-2 glass hover:bg-white/15 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 group"
                title="Settings (Ctrl+S)"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                <span className="gradient-text">ChordAI</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                AI-powered chord progression generator. Create unique, genre-specific chord
                progressions using deep learning.
              </p>
            </div>

            {/* Status Badge */}
            {!isModelLoading && (
              <div className="mt-6 flex justify-center">
                <div className="px-4 py-2 glass rounded-full flex items-center gap-2 animate-fade-in">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-300">Model Ready</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Grid */}
        <main className="pb-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Input Form */}
              <div className="lg:col-span-1">
                <InputForm />
              </div>

              {/* Right Column - Display & Player */}
              <div className="lg:col-span-2 space-y-6">
                <ProgressionDisplay />
                <ChordPlayer />
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-12 text-center">
              <div className="glass rounded-xl p-6 max-w-4xl mx-auto">
                <h3 className="text-lg font-semibold mb-3 text-white">How it works</h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-400">
                  <div>
                    <div className="w-12 h-12 mx-auto mb-3 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="font-medium text-white mb-1">1. Choose Settings</p>
                    <p>Select genre, mood, key, and other parameters for your progression</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <p className="font-medium text-white mb-1">2. AI Generation</p>
                    <p>Our LSTM neural network generates a unique chord progression</p>
                  </div>
                  <div>
                    <div className="w-12 h-12 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="font-medium text-white mb-1">3. Play & Export</p>
                    <p>Listen to your progression and refine it until it's perfect</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 text-sm text-gray-500">
                <p>
                  Powered by TensorFlow.js • Trained on 1,080 chord progressions • Open source on{' '}
                  <a
                    href="https://github.com"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    GitHub
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
