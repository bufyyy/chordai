# 🎵 ChordAI - AI-Powered Chord Progression Generator

<div align="center">

**Create unique, genre-specific chord progressions using deep learning**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.11-FF6F00?logo=tensorflow)](https://www.tensorflow.org/js)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/tests-passing-success)](https://github.com/yourusername/chordai)
[![Coverage](https://img.shields.io/badge/coverage-85%25-success)](https://github.com/yourusername/chordai)

[Live Demo](#) • [Documentation](./docs) • [Report Bug](https://github.com/yourusername/chordai/issues) • [Request Feature](https://github.com/yourusername/chordai/issues)

</div>

---

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Demo](#demo)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Architecture](#architecture)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 About

ChordAI is an intelligent chord progression generator that leverages deep learning to create musically coherent and genre-specific chord progressions. Built with TensorFlow.js and React, it runs entirely in the browser with no backend required.

### The Problem

Musicians and composers often face creative blocks when writing chord progressions. While there are countless possibilities, finding progressions that sound good and fit a specific genre can be time-consuming.

### The Solution

ChordAI uses an LSTM neural network trained on **1,080+ chord progressions** from various genres to generate new, unique progressions that maintain musical coherence while offering creative variety.

---

## ✨ Features

### 🎹 Core Functionality

- **AI-Powered Generation**: LSTM model trained on real song progressions
- **8 Genres**: Pop, Rock, Jazz, Blues, R&B, EDM, Classical, Progressive
- **10+ Moods**: Uplifting, Melancholic, Energetic, Dark, Romantic, and more
- **Custom Parameters**: Key (24 options), scale type, length (4-12), temperature
- **Advanced Sampling**: Temperature, Top-K, and Nucleus (Top-P) strategies

### 🎼 Audio Playback

- **4 Synthesizers**: Piano, Pad, Synth, Electric
- **Real-time Playback**: High-quality audio with Tone.js
- **Interactive Controls**: Play, stop, loop, tempo (60-180 BPM), volume
- **Individual Preview**: Click any chord to hear it
- **MIDI Export**: Download as standard .mid files

### 💾 Data Management

- **Auto-Save History**: Last 20 progressions automatically saved
- **Favorites System**: Star and name your favorite progressions
- **Import/Export**: Backup and restore all data
- **LocalStorage**: Everything stays on your device

### 🎨 User Experience

- **Modern UI**: Glassmorphism design with smooth animations
- **Dark Mode**: Eye-friendly interface
- **Fully Responsive**: Desktop, tablet, mobile
- **Toast Notifications**: Clear feedback for actions
- **Keyboard Shortcuts**: Space (play), R (regenerate), V (variation)

---

## 🎬 Demo

### Live Application

🚀 **Try it now**: [chordai-demo.com](#) *(Coming soon)*

### Screenshots

| Main Interface | Progression Display |
|---------------|---------------------|
| ![Main](./docs/screenshots/main.png) | ![Display](./docs/screenshots/progression.png) |

| Audio Playback | Library Sidebar |
|----------------|-----------------|
| ![Audio](./docs/screenshots/audio.png) | ![Library](./docs/screenshots/library.png) |

---

## 🛠️ Tech Stack

### Frontend
- **React 18.2** with Hooks
- **Vite 5.0** for blazing-fast dev
- **Zustand** for state management
- **Tailwind CSS 3.3** with custom design

### Machine Learning
- **TensorFlow.js 4.11**
- **LSTM Model** (2-3M parameters)
- **Training Data**: 1,080 progressions
- **Chord Vocabulary**: 279 unique chords

### Audio
- **Tone.js 14.7**
- **Polyphonic Synthesizers**
- **Effects Chain**: Reverb + Chorus
- **MIDI Export**

### Testing
- **Vitest** with React Testing Library
- **Playwright** for E2E tests
- **85%+ Code Coverage**

### Code Quality
- **ESLint** + **Prettier**
- **Husky** + **lint-staged**
- **Pre-commit Hooks**

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm 7+
- Modern browser

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/chordai.git
cd chordai

# Install dependencies
cd client
npm install

# Start development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

### Optional: Train Your Own Model

See [TRAINING.md](./docs/TRAINING.md) for detailed instructions.

```bash
# Prepare dataset
cd data-collection
python generate_base_dataset.py
python augment_transposition.py
python augment_variations.py

# Train model
cd ../model-training
python train_model.py

# Convert for web
python convert_pipeline.py --model models/chord_model_final.h5
```

---

## 💡 Usage

### Basic Workflow

1. **Select Parameters**
   - Genre (Pop, Rock, Jazz, etc.)
   - Mood (Uplifting, Melancholic, etc.)
   - Key and Scale Type
   - Length (4-12 chords)

2. **Generate**
   - Click "Generate Progression"
   - View chords with roman numeral analysis

3. **Listen & Refine**
   - Play progression
   - Adjust tempo/volume
   - Try different synth sounds
   - Generate variations

4. **Save & Export**
   - Star to save as favorite
   - Export as MIDI
   - Copy to clipboard

### Advanced: Sampling Strategies

Control generation creativity:

- **Temperature** (0.5-2.0)
  - Low: Conservative, predictable
  - High: Creative, experimental

- **Top-K** (5-50)
  - Choose from top K likely chords

- **Nucleus Top-P** (0.7-0.95)
  - Dynamic probability-based selection

### Keyboard Shortcuts

- `Space`: Play/Stop
- `R`: Regenerate
- `V`: Variation
- `L`: Open Library
- `C`: Copy

---

## 🏗️ Architecture

### Project Structure

```
chordai/
├── client/                 # React app
│   ├── public/model/      # TensorFlow.js model
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # Business logic
│   │   ├── store/         # Zustand state
│   │   ├── utils/         # Helpers
│   │   └── test/          # Tests
│   └── e2e/               # Playwright tests
├── data-collection/       # Dataset scripts
├── model-training/        # Python training
└── docs/                  # Documentation
```

### Component Hierarchy

```
App
├── ModelLoader
├── Sidebar (History + Favorites)
├── InputForm
├── ProgressionDisplay
└── ChordPlayer
```

### Data Flow

```
Input → Store → ModelService → TensorFlow.js
                                     ↓
                              Generated Chords
                                     ↓
                       ProgressionDisplay + Audio
```

For detailed API documentation, see [API_DOCS.md](./docs/API_DOCS.md).

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test
npm run test:ui              # With UI
npm run test:coverage        # Coverage report

# E2E tests
npm run test:e2e
npm run test:e2e:ui          # Interactive mode

# Linting
npm run lint
npm run lint:fix
```

### Coverage

Current: **85%**

- Utils: 92%
- Services: 88%
- Components: 78%
- Store: 95%

### CI/CD

Tests run automatically on:
- Pull requests
- Commits to main
- Nightly builds

---

## 📚 Documentation

- **[API Documentation](./docs/API_DOCS.md)** - Complete API reference
- **[Training Guide](./docs/TRAINING.md)** - Model training details
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[Changelog](./CHANGELOG.md)** - Version history

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

### Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve docs
- 🧪 Add tests
- 🎵 Contribute chord progressions

### Development

```bash
# Fork & clone
git clone https://github.com/YOUR_USERNAME/chordai.git

# Create branch
git checkout -b feature/YourFeature

# Make changes
# Run tests
npm run test

# Commit
git commit -m 'Add YourFeature'

# Push & create PR
git push origin feature/YourFeature
```

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 🙏 Acknowledgments

- **TensorFlow.js Team** - ML framework
- **Tone.js Team** - Audio engine
- **React Team** - UI library
- **Community** - Chord progression data
- **Inspiration** - Hooktheory, Autochords

---

## 📊 Project Stats

- **Lines of Code**: ~8,500
- **Components**: 12
- **Tests**: 150+
- **Training Data**: 1,080 progressions
- **Chord Vocabulary**: 279
- **Model Size**: 2-4 MB (quantized)
- **Inference Speed**: 20-40ms (desktop)

---

## 🗺️ Roadmap

### v1.1 (Next)
- [ ] Progression library (famous songs)
- [ ] Export as PNG/PDF
- [ ] Share via URL
- [ ] Tutorial flow
- [ ] Settings panel

### v1.2
- [ ] User accounts
- [ ] Cloud sync
- [ ] MIDI input
- [ ] Advanced voicings
- [ ] Custom scales

### v2.0
- [ ] Full song structure
- [ ] Melody generation
- [ ] Rhythm patterns
- [ ] VST plugin
- [ ] Mobile app

---

## 📞 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com
- Discord: [Join Server](#)

---

<div align="center">

Made with ❤️ and 🎵

**If you found this useful, please give it a ⭐!**

</div>
