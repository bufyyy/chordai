import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(),
  createGain: vi.fn(),
  destination: {},
  currentTime: 0,
  resume: vi.fn().mockResolvedValue(undefined),
}));

// Helper: create a chainable mock object (for Tone.js nodes)
const createChainableMock = () => {
  const mock = {
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    toDestination: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
    set: vi.fn(),
  };
  return vi.fn().mockImplementation(() => mock);
};

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  loadLayersModel: vi.fn(),
  tensor2d: vi.fn(),
  tidy: vi.fn((fn) => fn()),
  getBackend: vi.fn(() => 'cpu'),
  Frequency: vi.fn(),
}));

// Mock Tone.js
vi.mock('tone', () => ({
  start: vi.fn().mockResolvedValue(undefined),
  Reverb: createChainableMock(),
  Chorus: createChainableMock(),
  Volume: createChainableMock(),
  PolySynth: createChainableMock(),
  Sampler: createChainableMock(),
  Synth: createChainableMock(),
  FMSynth: createChainableMock(),
  Transport: {
    bpm: { value: 120 },
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
  },
  Sequence: vi.fn(),
  Draw: {
    schedule: vi.fn((fn) => fn()),
  },
  Frequency: vi.fn(() => ({
    toFrequency: () => 440,
  })),
}));
