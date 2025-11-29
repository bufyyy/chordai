import { useEffect } from 'react';
import useStore from '../store/useStore';
import modelService from '../services/modelService';

const ModelLoader = () => {
  const {
    isModelLoading,
    modelLoadProgress,
    modelError,
    setModel,
    setPreprocessor,
    setModelLoading,
    setModelLoadProgress,
    setModelError,
  } = useStore();

  useEffect(() => {
    // Prevent double loading in React StrictMode
    let mounted = true;

    if (mounted) {
      loadModel();
    }

    return () => {
      mounted = false;
    };
  }, []);

  const loadModel = async () => {
    try {
      // Get model service instance
      // modelService is already the instance


      // Check if already loaded
      if (modelService.isReady()) {
        console.log('Model already loaded, skipping...');
        setModel(modelService.model);
        setPreprocessor(modelService.preprocessor);
        setModelLoading(false);
        return;
      }

      setModelLoading(true);
      setModelLoadProgress(0);

      setModelLoadProgress(20);

      // Load model from local public folder (served by Vercel)
      const result = await modelService.loadModel(
        '/model/model.json',
        '/model/metadata'
      );

      setModelLoadProgress(90);
      setModelLoadProgress(100);

      // Save to store
      const model = modelService.model;
      const preprocessor = modelService.preprocessor;

      setModel(model);
      setPreprocessor(preprocessor);
      setModelLoading(false);

      if (result.mode === 'demo') {
        console.log('✅ Running in DEMO mode');
      } else {
        console.log('✅ Model loaded successfully');
      }

    } catch (error) {
      console.error('Error loading model:', error);
      setModelError(error.message);
      setModelLoading(false);
    }
  };

  if (!isModelLoading && !modelError) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
      <div className="glass max-w-md w-full mx-4 p-8 rounded-2xl shadow-2xl">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse-glow">
              <svg
                className="w-10 h-10 text-white"
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
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold mb-2 gradient-text">ChordAI</h2>
          <p className="text-gray-400 mb-6">AI-Powered Chord Progression Generator</p>

          {modelError ? (
            // Error state
            <div className="text-red-400">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="font-semibold mb-2">Failed to load model</p>
              <p className="text-sm text-gray-500">{modelError}</p>
              <button
                onClick={loadModel}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            // Loading state
            <div>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Loading model...</span>
                  <span className="text-blue-400 font-semibold">{modelLoadProgress}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
                    style={{ width: `${modelLoadProgress}%` }}
                  />
                </div>
              </div>

              {/* Loading stages */}
              <div className="text-sm text-gray-500 space-y-1">
                <div className={modelLoadProgress >= 20 ? 'text-green-400' : ''}>
                  {modelLoadProgress >= 20 ? '✓' : '○'} Initializing TensorFlow.js
                </div>
                <div className={modelLoadProgress >= 50 ? 'text-green-400' : ''}>
                  {modelLoadProgress >= 50 ? '✓' : '○'} Loading vocabularies
                </div>
                <div className={modelLoadProgress >= 90 ? 'text-green-400' : ''}>
                  {modelLoadProgress >= 90 ? '✓' : '○'} Loading neural network
                </div>
                <div className={modelLoadProgress >= 100 ? 'text-green-400' : ''}>
                  {modelLoadProgress >= 100 ? '✓' : '○'} Warming up model
                </div>
              </div>

              {/* Tip */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300">
                  💡 Tip: The model will load faster on subsequent visits thanks to browser
                  caching.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelLoader;
