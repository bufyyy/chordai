import { useState, useEffect } from 'react';
import { isOnboardingCompleted, completeOnboarding } from '../utils/storage';

/**
 * Tutorial/Onboarding component
 * Shows a step-by-step guide for first-time users
 */
function Tutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Show tutorial if not completed
    if (!isOnboardingCompleted()) {
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, []);

  const steps = [
    {
      title: 'Welcome to ChordAI! 🎵',
      description:
        'Generate unique chord progressions using AI. Let me show you how it works in just a few steps.',
      icon: (
        <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      ),
    },
    {
      title: 'Choose Your Parameters',
      description:
        'Select genre, mood, key, and scale type to customize your progression. Each parameter influences the AI generation.',
      icon: (
        <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      ),
    },
    {
      title: 'Generate & Listen',
      description:
        'Click "Generate" to create a progression. Use the player controls to listen, adjust tempo, and try different synth sounds.',
      icon: (
        <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      ),
    },
    {
      title: 'Save & Export',
      description:
        'Star your favorites, view history, or export as MIDI. Use keyboard shortcuts: Space (play), R (regenerate), L (library).',
      icon: (
        <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    setIsOpen(false);
  };

  const handleClose = () => {
    completeOnboarding();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl p-8 max-w-lg w-full border border-white/10 shadow-2xl animate-scale-in">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">{step.icon}</div>

        {/* Content */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">{step.title}</h2>
          <p className="text-gray-400 leading-relaxed">{step.description}</p>
        </div>

        {/* Step Counter */}
        <div className="text-center text-sm text-gray-500 mb-6">
          Step {currentStep + 1} of {steps.length}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Previous
            </button>
          )}

          <button
            onClick={handleSkip}
            className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg font-medium transition-colors flex-1"
          >
            Skip Tutorial
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl flex-1"
          >
            {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Tutorial;
