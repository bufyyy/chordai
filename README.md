# 🎵 ChordAI - AI-Powered Chord Progression Generator

<div align="center">

**Create unique, genre-specific chord progressions using deep learning**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-FF6F00?logo=tensorflow)](https://www.tensorflow.org/js)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev/)

[Live Demo](https://chordai.vercel.app) • [Report Bug](https://github.com/bufyyy/chordai/issues) • [Request Feature](https://github.com/bufyyy/chordai/issues)

</div>

---

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Architecture](#architecture)
- [License](#license)

---

## 🎯 About

ChordAI is an intelligent chord progression generator that leverages deep learning to create musically coherent and genre-specific chord progressions. Built with TensorFlow.js and React, it runs **entirely in the browser** with no backend required.

### The Problem

Musicians and composers often face creative blocks when writing chord progressions. While there are countless possibilities, finding progressions that sound good and fit a specific genre can be time-consuming.

### The Solution

ChordAI uses an **LSTM neural network** trained on chord progressions from various genres to generate new, unique progressions that maintain musical coherence while offering creative variety.

---

## ✨ Features

### 🎹 Core Functionality

- **AI-Powered Generation**: LSTM model running client-side with TensorFlow.js
- **13 Genres**: Classical, Disco, Electronic, Funk, Hip Hop, Jazz, Latin, Metal, Pop, Punk, Reggae, Rock, Soul
- **Start Chord Selection**: Choose a starting chord or let AI pick one based on adventure level
- **Adventure Slider**: Control creativity from Safe (predictable) to Experimental (chaotic)
- **Progressive Display**: Watch chords generate one-by-one in real-time

### 🎛️ Sampling Controls

- **Temperature Scaling**: Low adventure = conservative, high adventure = creative
- **Top-P (Nucleus) Sampling**: Dynamic probability-based chord selection
- **Repetition Penalty**: Hard ban on immediate chord repetition for variety

### 💾 Data Management

- **Auto-Save History**: Progressions automatically saved to browser storage
- **Favorites System**: Star your favorite progressions
- **Copy to Clipboard**: One-click copy with proper chord notation
- **LocalStorage**: Everything stays on your device

### 🎨 User Experience

- **Modern UI**: Glassmorphism design with smooth animations
- **Dark Mode**: Eye-friendly dark interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Feedback**: Toast notifications for all actions
- **Detected Key Display**: Automatic key detection for generated progressions

---

## 🛠️ Tech Stack

### Frontend
- **React 18.2** with Hooks
- **Vite 5.0** for fast development
- **Zustand** for state management
- **Tailwind CSS** with custom glassmorphism design

### Machine Learning
- **TensorFlow.js 4.22**
- **Sequential LSTM Model** (~378K parameters)
- **Chord Vocabulary**: 765 tokens (749 chords + 16 special tokens)
- **Input Sequence**: 5 tokens (Genre, Start, History)
- **Special Tokens**: `<GENRE=...>`, `<START>`, `<PAD>`, `<END>`

### Audio
- **Tone.js 14.9** for audio synthesis
- **Polyphonic Piano Synth**
- **Real-time Playback**

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm 7+
- Modern browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Clone repository
git clone https://github.com/bufyyy/chordai.git
cd chordai

# Install dependencies
cd client
npm install

# Start development server
npm run dev

# Open browser at http://localhost:5173
```

### Model Files

The model files are included in the repository:
- `client/public/model/web_model/model.json` - Model architecture
- `client/public/model/web_model/group1-shard1of1.bin` - Model weights (~1.5MB)
- `client/public/model/mappings.json` - Token vocabulary

---

## 💡 Usage

### Basic Workflow

1. **Set Start Chord** (Optional)
   - Enter a chord like "C", "Am", "G7"
   - Leave empty for AI to pick based on adventure level

2. **Select Genre**
   - Choose from 13 available genres
   - Genre conditions the model's output style

3. **Adjust Adventure**
   - Safe (0%): Common, predictable progressions
   - Natural (50%): Balanced creativity
   - Experimental (100%): Wild, unusual choices

4. **Set Count**
   - Choose how many chords to generate (1-16)

5. **Generate**
   - Click "Generate Progression"
   - Watch chords appear progressively
   - See detected key automatically

6. **Save & Share**
   - Star to save as favorite
   - Copy to clipboard
   - View in history

### Chord Notation

The model uses a specific notation that gets converted for display:
- Sharps: `Fs` → `F#`, `Cs` → `C#`
- Flats: `Bb`, `Eb`, `Ab` (standard notation)
- Suspended: `Fsus4`, `Asus2` (preserved correctly)
- Extensions: `Am7`, `Cmaj9`, `G13`

---

## 🏗️ Architecture

### Project Structure

```
chordai/
├── client/                    # React application
│   ├── public/
│   │   └── model/            # TensorFlow.js model files
│   │       ├── web_model/    # Model JSON + weights
│   │       └── mappings.json # Token vocabulary
│   └── src/
│       ├── components/       # React components
│       │   ├── InputForm.jsx       # User input controls
│       │   ├── ProgressionDisplay.jsx # Chord display
│       │   ├── ModelLoader.jsx     # Model loading UI
│       │   └── ChordPlayer.jsx     # Audio playback
│       ├── services/
│       │   └── modelService.js     # AI inference logic
│       ├── store/
│       │   └── useStore.js         # Zustand state
│       └── utils/
│           └── storage.js          # LocalStorage helpers
└── docs/                     # Documentation
```

### Model Architecture

```
Input: [Genre, Start, Chord1, Chord2, Chord3] (length 5)
         ↓
    Embedding (765 → 64)
         ↓
    LSTM (128 units, return_sequences=true)
         ↓
    Dropout (0.2)
         ↓
    LSTM (128 units)
         ↓
    Dropout (0.2)
         ↓
    Dense (765, softmax)
         ↓
Output: Probability distribution over 765 tokens
```

### Inference Flow

```
User Input → InputForm → modelService.predictNextChord()
                              ↓
                    1. Build token sequence
                    2. Run TensorFlow.js inference
                    3. Apply repetition penalty
                    4. Top-P sampling with temperature
                    5. Decode token to chord name
                              ↓
                    ProgressionDisplay (formatted)
```

---

## 📊 Model Details

| Property | Value |
|----------|-------|
| Architecture | Sequential LSTM |
| Total Parameters | 378,045 |
| Input Shape | [batch, 5] |
| Output Shape | [batch, 765] |
| Vocabulary Size | 765 tokens |
| Available Genres | 13 |
| Chord Types | 749 |
| Model Size | ~1.5 MB |

### Special Tokens

| Token | ID | Purpose |
|-------|-----|---------|
| `<END>` | 0 | End of sequence |
| `<GENRE=...>` | 1-13 | Genre conditioning |
| `<PAD>` | 14 | Padding |
| `<START>` | 15 | Sequence start |

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 🙏 Acknowledgments

- **TensorFlow.js Team** - Client-side ML framework
- **Tone.js Team** - Web audio synthesis
- **React Team** - UI library
- **Vercel** - Hosting platform

---

## 📞 Contact

- GitHub: [@bufyyy](https://github.com/bufyyy)
- Email: bugrafiridinoglu@gmail.com
- Live App: [chordai.vercel.app](https://chordai.vercel.app)

---

<div align="center">

Made with ❤️ and 🎵

**If you found this useful, please give it a ⭐!**

</div>
