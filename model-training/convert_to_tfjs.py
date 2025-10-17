"""
Convert Keras Model to TensorFlow.js Format

Converts trained Keras model to TF.js for web deployment with:
- Model conversion
- Quantization for size reduction
- Metadata generation
- Vocabulary exports
"""

try:
    import tensorflow as tf
    from tensorflow import keras
    import tensorflowjs as tfjs
    TFJS_AVAILABLE = True
except ImportError:
    TFJS_AVAILABLE = False
    print("Error: tensorflowjs not available")
    print("Install with: pip install tensorflowjs")

import json
import os
import shutil
from pathlib import Path
import argparse


class TFJSConverter:
    """Convert Keras model to TensorFlow.js"""

    def __init__(self, model_path, output_dir='../client/public/model'):
        """Initialize converter"""

        self.model_path = model_path
        self.output_dir = output_dir
        self.metadata_dir = os.path.join(output_dir, 'metadata')

        # Create output directories
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.metadata_dir, exist_ok=True)

        print(f"\nTensorFlow.js Model Converter")
        print("="*70)
        print(f"Input model: {model_path}")
        print(f"Output directory: {output_dir}")

    def load_model(self):
        """Load Keras model"""

        print("\n[1/6] Loading Keras model...")

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found: {self.model_path}")

        self.model = keras.models.load_model(self.model_path)

        # Get model size
        self.original_size = os.path.getsize(self.model_path) / (1024 * 1024)

        print(f"  Model loaded successfully")
        print(f"  Original model size: {self.original_size:.2f} MB")

        return self.model

    def convert_to_tfjs(self, quantize=True):
        """Convert model to TensorFlow.js format"""

        print("\n[2/6] Converting to TensorFlow.js...")

        # Conversion options
        if quantize:
            print("  Applying quantization (uint8)...")
            quantization_dtype = 'uint8'
        else:
            quantization_dtype = None

        # Convert
        tfjs.converters.save_keras_model(
            self.model,
            self.output_dir,
            quantization_dtype_map={
                'uint8': quantization_dtype
            } if quantize else None
        )

        print(f"  Conversion complete!")
        print(f"  Output: {self.output_dir}")

        # Calculate converted size
        self._calculate_tfjs_size()

    def _calculate_tfjs_size(self):
        """Calculate total size of TF.js model files"""

        total_size = 0
        bin_files = []

        for file in os.listdir(self.output_dir):
            if file.endswith('.bin') or file.endswith('.json'):
                file_path = os.path.join(self.output_dir, file)
                size = os.path.getsize(file_path)
                total_size += size

                if file.endswith('.bin'):
                    bin_files.append((file, size / (1024 * 1024)))

        self.tfjs_size = total_size / (1024 * 1024)

        print(f"\n  TF.js model size: {self.tfjs_size:.2f} MB")
        print(f"  Size reduction: {(1 - self.tfjs_size/self.original_size)*100:.1f}%")

        if bin_files:
            print(f"\n  Weight files:")
            for filename, size in bin_files:
                print(f"    - {filename}: {size:.2f} MB")

    def export_vocabularies(self, data_dir='../dataset'):
        """Export vocabularies for web"""

        print("\n[3/6] Exporting vocabularies...")

        # Load vocabularies
        with open(os.path.join(data_dir, 'chord_vocab.json'), 'r', encoding='utf-8') as f:
            chord_vocab = json.load(f)

        with open(os.path.join(data_dir, 'metadata_vocab.json'), 'r', encoding='utf-8') as f:
            metadata_vocab = json.load(f)

        # Export chord vocabulary
        chord_vocab_output = {
            'vocab_size': chord_vocab['vocab_size'],
            'chord_to_id': chord_vocab['chord_to_id'],
            'id_to_chord': chord_vocab['id_to_chord'],
            'special_tokens': chord_vocab['special_tokens']
        }

        with open(os.path.join(self.metadata_dir, 'chord_vocab.json'), 'w', encoding='utf-8') as f:
            json.dump(chord_vocab_output, f, indent=2, ensure_ascii=False)

        print(f"  ✓ chord_vocab.json ({chord_vocab['vocab_size']} chords)")

        # Export genre mapping
        with open(os.path.join(self.metadata_dir, 'genre_mapping.json'), 'w', encoding='utf-8') as f:
            json.dump(metadata_vocab['genre_vocab'], f, indent=2)

        print(f"  ✓ genre_mapping.json ({len(metadata_vocab['genre_vocab'])} genres)")

        # Export mood mapping
        with open(os.path.join(self.metadata_dir, 'mood_mapping.json'), 'w', encoding='utf-8') as f:
            json.dump(metadata_vocab['mood_vocab'], f, indent=2)

        print(f"  ✓ mood_mapping.json ({len(metadata_vocab['mood_vocab'])} moods)")

        # Export key mapping
        with open(os.path.join(self.metadata_dir, 'key_mapping.json'), 'w', encoding='utf-8') as f:
            json.dump(metadata_vocab['key_vocab'], f, indent=2)

        print(f"  ✓ key_mapping.json ({len(metadata_vocab['key_vocab'])} keys)")

        # Export scale type mapping
        with open(os.path.join(self.metadata_dir, 'scale_type_mapping.json'), 'w', encoding='utf-8') as f:
            json.dump(metadata_vocab['scale_type_vocab'], f, indent=2)

        print(f"  ✓ scale_type_mapping.json ({len(metadata_vocab['scale_type_vocab'])} types)")

    def export_model_config(self, data_dir='../dataset'):
        """Export model configuration"""

        print("\n[4/6] Exporting model configuration...")

        # Load preprocessing metadata
        with open(os.path.join(data_dir, 'preprocessing_metadata.json'), 'r', encoding='utf-8') as f:
            preprocessing_meta = json.load(f)

        # Create model config
        config = {
            'model_version': '1.0',
            'model_type': 'lstm_chord_progression',
            'input_specs': {
                'chord_sequence': {
                    'shape': [None, preprocessing_meta['max_sequence_length']],
                    'dtype': 'int32',
                    'name': 'chord_sequence_input'
                },
                'genre': {
                    'shape': [None, 1],
                    'dtype': 'int32',
                    'name': 'genre_input'
                },
                'mood': {
                    'shape': [None, 1],
                    'dtype': 'int32',
                    'name': 'mood_input'
                },
                'key': {
                    'shape': [None, 1],
                    'dtype': 'int32',
                    'name': 'key_input'
                },
                'scale_type': {
                    'shape': [None, 1],
                    'dtype': 'int32',
                    'name': 'scale_type_input'
                }
            },
            'output_specs': {
                'shape': [None, preprocessing_meta['max_sequence_length'], preprocessing_meta['vocab_sizes']['chords']],
                'dtype': 'float32',
                'description': 'Probability distribution over chord vocabulary for each position'
            },
            'vocab_sizes': preprocessing_meta['vocab_sizes'],
            'max_sequence_length': preprocessing_meta['max_sequence_length'],
            'special_tokens': {
                'pad_id': 0,
                'start_id': 1,
                'end_id': 2,
                'unk_id': 3
            }
        }

        with open(os.path.join(self.metadata_dir, 'model_config.json'), 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)

        print(f"  ✓ model_config.json")
        print(f"    - Max sequence length: {config['max_sequence_length']}")
        print(f"    - Vocab size: {config['vocab_sizes']['chords']}")

    def create_readme(self):
        """Create README for model directory"""

        print("\n[5/6] Creating README...")

        readme_content = f"""# ChordAI TensorFlow.js Model

This directory contains the converted TensorFlow.js model for ChordAI chord progression generation.

## Files

- `model.json` - Model architecture and metadata
- `group1-shard*.bin` - Model weights (quantized to uint8)
- `metadata/` - Vocabularies and configuration files

## Model Specifications

- **Original size**: {self.original_size:.2f} MB (Keras .h5)
- **TF.js size**: {self.tfjs_size:.2f} MB
- **Size reduction**: {(1 - self.tfjs_size/self.original_size)*100:.1f}%

## Usage in JavaScript

```javascript
import * as tf from '@tensorflow/tfjs';

// Load model
const model = await tf.loadLayersModel('/model/model.json');

// Load vocabularies
const chordVocab = await fetch('/model/metadata/chord_vocab.json').then(r => r.json());
const genreMapping = await fetch('/model/metadata/genre_mapping.json').then(r => r.json());

// Prepare input
const chordSequence = tf.tensor2d([[1, 5, 10, 15, 0, 0, 0, 0, 0, 0, 0, 0]], [1, 12], 'int32');
const genreId = tf.tensor2d([[0]], [1, 1], 'int32');
const moodId = tf.tensor2d([[2]], [1, 1], 'int32');
const keyId = tf.tensor2d([[0]], [1, 1], 'int32');
const scaleTypeId = tf.tensor2d([[0]], [1, 1], 'int32');

// Predict
const prediction = model.predict([
  chordSequence,
  genreId,
  moodId,
  keyId,
  scaleTypeId
]);

// Get next chord probabilities
const probs = await prediction.array();
```

## Metadata Files

### chord_vocab.json
Maps chord names to integer IDs and vice versa.

### genre_mapping.json
Genre names to IDs: pop, rock, jazz, blues, rnb, edm, classical, progressive

### mood_mapping.json
27 different moods with their IDs

### key_mapping.json
24 keys (12 major + 12 minor)

### scale_type_mapping.json
major (0) or minor (1)

### model_config.json
Complete input/output specifications and model configuration

## Notes

- Model uses uint8 quantization for reduced size
- All inputs must be int32 tensors
- Output is float32 probability distribution
- Max sequence length: 12 chords
- Vocabulary size: 279 chords (including special tokens)

---
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

        with open(os.path.join(self.output_dir, 'README.md'), 'w', encoding='utf-8') as f:
            f.write(readme_content)

        print(f"  ✓ README.md")

    def generate_report(self):
        """Generate conversion report"""

        print("\n[6/6] Generating conversion report...")

        report = {
            'conversion_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'original_model': self.model_path,
            'output_directory': self.output_dir,
            'sizes': {
                'original_mb': round(self.original_size, 2),
                'tfjs_mb': round(self.tfjs_size, 2),
                'reduction_percent': round((1 - self.tfjs_size/self.original_size)*100, 1)
            },
            'files_generated': [
                'model.json',
                'group1-shard*.bin',
                'metadata/chord_vocab.json',
                'metadata/genre_mapping.json',
                'metadata/mood_mapping.json',
                'metadata/key_mapping.json',
                'metadata/scale_type_mapping.json',
                'metadata/model_config.json',
                'README.md'
            ],
            'status': 'success'
        }

        report_path = os.path.join(self.output_dir, 'conversion_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)

        print(f"  ✓ conversion_report.json")

        return report


def main():
    """Main conversion pipeline"""

    from datetime import datetime

    parser = argparse.ArgumentParser(description='Convert Keras model to TensorFlow.js')
    parser.add_argument('--model', type=str, required=True, help='Path to Keras model (.h5)')
    parser.add_argument('--output', type=str, default='../client/public/model', help='Output directory')
    parser.add_argument('--data-dir', type=str, default='../dataset', help='Dataset directory')
    parser.add_argument('--no-quantize', action='store_true', help='Disable quantization')

    args = parser.parse_args()

    if not TFJS_AVAILABLE:
        print("\nError: tensorflowjs package required")
        print("Install with: pip install tensorflowjs")
        return

    print("\n" + "="*70)
    print("KERAS TO TENSORFLOW.JS CONVERTER")
    print("="*70)

    # Initialize converter
    converter = TFJSConverter(args.model, args.output)

    # Run conversion pipeline
    try:
        # 1. Load model
        converter.load_model()

        # 2. Convert to TF.js
        converter.convert_to_tfjs(quantize=not args.no_quantize)

        # 3. Export vocabularies
        converter.export_vocabularies(args.data_dir)

        # 4. Export model config
        converter.export_model_config(args.data_dir)

        # 5. Create README
        converter.create_readme()

        # 6. Generate report
        report = converter.generate_report()

        # Final summary
        print("\n" + "="*70)
        print("CONVERSION SUMMARY")
        print("="*70)
        print(f"\n✓ Conversion successful!")
        print(f"\nModel sizes:")
        print(f"  Original: {report['sizes']['original_mb']:.2f} MB")
        print(f"  TF.js: {report['sizes']['tfjs_mb']:.2f} MB")
        print(f"  Reduction: {report['sizes']['reduction_percent']:.1f}%")

        print(f"\nOutput directory: {args.output}")
        print(f"Files generated: {len(report['files_generated'])}")

        if report['sizes']['tfjs_mb'] > 15:
            print(f"\n⚠ Warning: Model size ({report['sizes']['tfjs_mb']:.2f} MB) exceeds 15MB target")
            print("  Consider:")
            print("  - Further quantization")
            print("  - Model pruning")
            print("  - Reducing LSTM units")
        else:
            print(f"\n✓ Model size ({report['sizes']['tfjs_mb']:.2f} MB) within 15MB target")

        print("\n" + "="*70)
        print("\nNext steps:")
        print("  1. Test with Node.js: node test_tfjs_model.js")
        print("  2. Copy to web app: cp -r output/* client/public/model/")
        print("  3. Use in React app with @tensorflow/tfjs")

    except Exception as e:
        print(f"\n✗ Conversion failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
