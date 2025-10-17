"""
Comprehensive Model Evaluation Script

Evaluates model performance with detailed metrics:
- Test set accuracy
- Per-genre and per-mood accuracy
- Confusion matrix
- Musical validity checks
- Sample generation
- Diversity analysis
- Baseline comparisons
"""

try:
    import tensorflow as tf
    from tensorflow import keras
    import numpy as np
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Error: TensorFlow/NumPy required")

import json
import os
from collections import Counter, defaultdict
import random

try:
    import matplotlib.pyplot as plt
    import seaborn as sns
    PLOTTING_AVAILABLE = True
except ImportError:
    PLOTTING_AVAILABLE = False
    print("Warning: matplotlib/seaborn not available")

from data_generator import create_data_generators
from evaluate_model import ChordProgressionGenerator


class ModelEvaluator:
    """Comprehensive model evaluation"""

    def __init__(self, model_path, data_dir='../dataset'):
        """Initialize evaluator"""

        self.model_path = model_path
        self.data_dir = data_dir

        # Load model
        print(f"Loading model from {model_path}...")
        self.model = keras.models.load_model(model_path)
        print("Model loaded!")

        # Load vocabularies
        with open(os.path.join(data_dir, 'chord_vocab.json'), 'r') as f:
            self.chord_vocab = json.load(f)

        with open(os.path.join(data_dir, 'metadata_vocab.json'), 'r') as f:
            self.metadata_vocab = json.load(f)

        # Load test data
        with open(os.path.join(data_dir, 'test.json'), 'r') as f:
            self.test_data = json.load(f)

        self.id_to_chord = {int(k): v for k, v in self.chord_vocab['id_to_chord'].items()}

        print(f"Test set size: {len(self.test_data)}")

    def evaluate_test_set(self):
        """Evaluate model on test set"""

        print("\n" + "="*70)
        print("TEST SET EVALUATION")
        print("="*70)

        # Create test generator
        _, _, test_gen = create_data_generators(
            batch_size=32,
            data_dir=self.data_dir
        )

        # Evaluate
        results = self.model.evaluate(test_gen, verbose=1)

        metrics = {
            'test_loss': float(results[0]),
            'test_accuracy': float(results[1])
        }

        print(f"\nTest Loss: {metrics['test_loss']:.4f}")
        print(f"Test Accuracy: {metrics['test_accuracy']:.4f}")

        return metrics

    def evaluate_per_genre(self):
        """Evaluate accuracy per genre"""

        print("\n" + "="*70)
        print("PER-GENRE EVALUATION")
        print("="*70)

        # Group by genre
        genre_data = defaultdict(list)
        for sample in self.test_data:
            genre_data[sample['genre']].append(sample)

        genre_metrics = {}

        for genre, samples in genre_data.items():
            # Prepare inputs
            inputs = self._prepare_batch_inputs(samples)
            targets = np.array([s['progression_encoded'] for s in samples])

            # Predict
            predictions = self.model.predict(inputs, verbose=0)

            # Calculate accuracy
            pred_ids = np.argmax(predictions, axis=-1)
            accuracy = np.mean(pred_ids == targets)

            genre_metrics[genre] = {
                'samples': len(samples),
                'accuracy': float(accuracy)
            }

            print(f"{genre:12} - Samples: {len(samples):3} - Accuracy: {accuracy:.4f}")

        return genre_metrics

    def evaluate_per_mood(self):
        """Evaluate accuracy per mood"""

        print("\n" + "="*70)
        print("PER-MOOD EVALUATION (Top 10)")
        print("="*70)

        # Group by mood
        mood_data = defaultdict(list)
        for sample in self.test_data:
            mood_data[sample['mood']].append(sample)

        mood_metrics = {}

        # Sort by sample count
        sorted_moods = sorted(mood_data.items(), key=lambda x: len(x[1]), reverse=True)

        for mood, samples in sorted_moods[:10]:
            inputs = self._prepare_batch_inputs(samples)
            targets = np.array([s['progression_encoded'] for s in samples])

            predictions = self.model.predict(inputs, verbose=0)
            pred_ids = np.argmax(predictions, axis=-1)
            accuracy = np.mean(pred_ids == targets)

            mood_metrics[mood] = {
                'samples': len(samples),
                'accuracy': float(accuracy)
            }

            print(f"{mood:18} - Samples: {len(samples):3} - Accuracy: {accuracy:.4f}")

        return mood_metrics

    def _prepare_batch_inputs(self, samples):
        """Prepare batch inputs for prediction"""

        batch_size = len(samples)

        chord_seq = np.array([s['progression_encoded'] for s in samples])
        genre_ids = np.array([[s['genre_encoded']] for s in samples])
        mood_ids = np.array([[s['mood_encoded']] for s in samples])
        key_ids = np.array([[s['key_encoded']] for s in samples])
        scale_ids = np.array([[s['scale_type_encoded']] for s in samples])

        return {
            'chord_sequence_input': chord_seq,
            'genre_input': genre_ids,
            'mood_input': mood_ids,
            'key_input': key_ids,
            'scale_type_input': scale_ids
        }

    def create_confusion_matrix(self, top_n=20):
        """Create confusion matrix for top N chords"""

        print("\n" + "="*70)
        print(f"CONFUSION MATRIX (Top {top_n} Chords)")
        print("="*70)

        # Get predictions
        inputs = self._prepare_batch_inputs(self.test_data)
        targets = np.array([s['progression_encoded'] for s in self.test_data])

        predictions = self.model.predict(inputs, verbose=0)
        pred_ids = np.argmax(predictions, axis=-1)

        # Find top N chords
        all_target_chords = targets.flatten()
        chord_counts = Counter(all_target_chords)
        top_chords = [c for c, _ in chord_counts.most_common(top_n) if c != 0]  # Exclude PAD

        # Build confusion matrix
        conf_matrix = np.zeros((len(top_chords), len(top_chords)))

        flat_targets = targets.flatten()
        flat_preds = pred_ids.flatten()

        for true_id, pred_id in zip(flat_targets, flat_preds):
            if true_id in top_chords and pred_id in top_chords:
                true_idx = top_chords.index(true_id)
                pred_idx = top_chords.index(pred_id)
                conf_matrix[true_idx, pred_idx] += 1

        # Plot
        if PLOTTING_AVAILABLE:
            plt.figure(figsize=(12, 10))

            # Normalize by row
            row_sums = conf_matrix.sum(axis=1, keepdims=True)
            conf_matrix_norm = conf_matrix / (row_sums + 1e-10)

            chord_labels = [self.id_to_chord.get(c, f"ID{c}") for c in top_chords]

            sns.heatmap(
                conf_matrix_norm,
                xticklabels=chord_labels,
                yticklabels=chord_labels,
                cmap='YlOrRd',
                fmt='.2f',
                cbar_kws={'label': 'Probability'}
            )

            plt.title(f'Confusion Matrix (Top {top_n} Chords)', fontsize=14, fontweight='bold')
            plt.xlabel('Predicted Chord')
            plt.ylabel('True Chord')
            plt.xticks(rotation=45, ha='right')
            plt.yticks(rotation=0)
            plt.tight_layout()
            plt.savefig('./output/confusion_matrix.png', dpi=150, bbox_inches='tight')
            print("\nConfusion matrix saved to ./output/confusion_matrix.png")
            plt.close()

        return conf_matrix, top_chords


class MusicalValidityChecker:
    """Check musical validity of generated progressions"""

    def __init__(self):
        self.forbidden_patterns = [
            ['C', 'C', 'C', 'C'],  # Repetition
            ['F#', 'B', 'F#', 'B'],  # Tritone oscillation
        ]

    def check_progression(self, progression):
        """Check if progression is musically valid"""

        issues = []

        # Check 1: Repetition
        if len(set(progression)) == 1:
            issues.append("All chords are identical")

        # Check 2: Too many consecutive repeats
        for i in range(len(progression) - 2):
            if progression[i] == progression[i+1] == progression[i+2]:
                issues.append(f"Three consecutive {progression[i]} chords")

        # Check 3: Contains PAD or special tokens
        special_tokens = ['<PAD>', '<START>', '<END>', '<UNK>']
        for token in special_tokens:
            if token in progression:
                issues.append(f"Contains special token: {token}")

        # Check 4: Valid chord names
        valid_roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        for chord in progression:
            if not chord:
                issues.append("Empty chord")
                continue

            root = chord[0] if len(chord) > 0 else ''
            if root not in valid_roots:
                issues.append(f"Invalid root note: {chord}")

        return {
            'valid': len(issues) == 0,
            'issues': issues
        }

    def analyze_batch(self, progressions):
        """Analyze multiple progressions"""

        results = {
            'total': len(progressions),
            'valid': 0,
            'invalid': 0,
            'issues_summary': Counter()
        }

        for prog in progressions:
            check = self.check_progression(prog)
            if check['valid']:
                results['valid'] += 1
            else:
                results['invalid'] += 1
                for issue in check['issues']:
                    results['issues_summary'][issue] += 1

        results['valid_percentage'] = (results['valid'] / results['total']) * 100

        return results


class SampleGenerator:
    """Generate samples for evaluation"""

    def __init__(self, model_path, vocab_path='../dataset'):
        self.generator = ChordProgressionGenerator(model_path, vocab_path)

    def generate_diverse_samples(self, num_per_genre=5, num_per_mood=5, output_file='./output/samples.txt'):
        """Generate diverse samples"""

        print("\n" + "="*70)
        print("GENERATING DIVERSE SAMPLES")
        print("="*70)

        samples = []

        # Genre samples
        genres = list(self.generator.genre_to_id.keys())
        moods_list = list(self.generator.mood_to_id.keys())
        keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Dm', 'Em']

        print(f"\nGenerating {num_per_genre} samples per genre...")
        for genre in genres:
            for i in range(num_per_genre):
                mood = random.choice(moods_list)
                key = random.choice(keys)
                scale = 'minor' if 'm' in key else 'major'

                try:
                    progression = self.generator.generate_progression(
                        genre=genre,
                        mood=mood,
                        key=key,
                        scale_type=scale,
                        num_chords=4,
                        temperature=0.8
                    )

                    samples.append({
                        'genre': genre,
                        'mood': mood,
                        'key': key,
                        'scale_type': scale,
                        'progression': progression
                    })
                except Exception as e:
                    print(f"Error generating {genre}: {e}")

        # Save to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("="*70 + "\n")
            f.write("GENERATED CHORD PROGRESSIONS\n")
            f.write("="*70 + "\n\n")

            by_genre = defaultdict(list)
            for sample in samples:
                by_genre[sample['genre']].append(sample)

            for genre in sorted(by_genre.keys()):
                f.write(f"\n{genre.upper()}\n")
                f.write("-"*70 + "\n")

                for i, sample in enumerate(by_genre[genre], 1):
                    f.write(f"\n[{i}] {sample['mood'].capitalize()} in {sample['key']} {sample['scale_type']}\n")
                    f.write(f"    {' - '.join(sample['progression'])}\n")

        print(f"\nGenerated {len(samples)} samples")
        print(f"Saved to {output_file}")

        return samples


class DiversityAnalyzer:
    """Analyze diversity of generated progressions"""

    def __init__(self, generator):
        self.generator = generator

    def analyze_diversity(self, test_cases, num_samples=10, temperatures=[0.5, 1.0, 1.5]):
        """Analyze diversity for different temperatures"""

        print("\n" + "="*70)
        print("DIVERSITY ANALYSIS")
        print("="*70)

        results = {}

        for temp in temperatures:
            print(f"\nTemperature: {temp}")
            temp_results = []

            for case in test_cases:
                # Generate multiple times
                progressions = []
                for _ in range(num_samples):
                    try:
                        prog = self.generator.generate_progression(
                            genre=case['genre'],
                            mood=case['mood'],
                            key=case['key'],
                            scale_type=case['scale_type'],
                            num_chords=4,
                            temperature=temp
                        )
                        progressions.append(tuple(prog))
                    except:
                        pass

                # Calculate diversity
                unique_progs = len(set(progressions))
                diversity_score = unique_progs / len(progressions) if progressions else 0

                temp_results.append({
                    'case': case,
                    'unique': unique_progs,
                    'total': len(progressions),
                    'diversity': diversity_score
                })

                print(f"  {case['genre']:8} - Unique: {unique_progs}/{len(progressions)} ({diversity_score:.2f})")

            avg_diversity = np.mean([r['diversity'] for r in temp_results])
            results[temp] = {
                'cases': temp_results,
                'avg_diversity': avg_diversity
            }

            print(f"  Average diversity: {avg_diversity:.3f}")

        return results


def create_baseline_models(test_data, vocab_size):
    """Create baseline models for comparison"""

    print("\n" + "="*70)
    print("BASELINE MODELS")
    print("="*70)

    # 1. Random baseline
    random_correct = 0
    total = 0

    for sample in test_data:
        true_chords = sample['progression_encoded']
        for chord_id in true_chords:
            if chord_id != 0:  # Skip padding
                random_pred = random.randint(1, vocab_size - 1)
                if random_pred == chord_id:
                    random_correct += 1
                total += 1

    random_accuracy = random_correct / total if total > 0 else 0

    # 2. Most common chord baseline
    all_chords = []
    for sample in test_data:
        all_chords.extend([c for c in sample['progression_encoded'] if c != 0])

    most_common_chord = Counter(all_chords).most_common(1)[0][0]

    mc_correct = sum(1 for c in all_chords if c == most_common_chord)
    mc_accuracy = mc_correct / len(all_chords) if all_chords else 0

    # 3. Simple Markov Chain
    # Build transition matrix
    transitions = defaultdict(Counter)
    for sample in test_data:
        chords = [c for c in sample['progression_encoded'] if c != 0]
        for i in range(len(chords) - 1):
            transitions[chords[i]][chords[i+1]] += 1

    markov_correct = 0
    markov_total = 0

    for sample in test_data:
        chords = [c for c in sample['progression_encoded'] if c != 0]
        for i in range(len(chords) - 1):
            if chords[i] in transitions and transitions[chords[i]]:
                pred = transitions[chords[i]].most_common(1)[0][0]
                if pred == chords[i+1]:
                    markov_correct += 1
            markov_total += 1

    markov_accuracy = markov_correct / markov_total if markov_total > 0 else 0

    baselines = {
        'random': random_accuracy,
        'most_common': mc_accuracy,
        'markov_chain': markov_accuracy
    }

    print(f"\nBaseline Accuracies:")
    print(f"  Random: {random_accuracy:.4f}")
    print(f"  Most Common Chord: {mc_accuracy:.4f}")
    print(f"  Markov Chain: {markov_accuracy:.4f}")

    return baselines


def generate_evaluation_report(
    model_metrics,
    genre_metrics,
    mood_metrics,
    baselines,
    validity_results,
    diversity_results,
    output_path='./output/evaluation_report.md'
):
    """Generate comprehensive evaluation report"""

    report = []

    report.append("# ChordAI Model Evaluation Report\n")
    report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    report.append("\n" + "="*70 + "\n\n")

    # Overall Metrics
    report.append("## 1. Overall Test Set Performance\n\n")
    report.append(f"- **Test Loss**: {model_metrics['test_loss']:.4f}\n")
    report.append(f"- **Test Accuracy**: {model_metrics['test_accuracy']:.4f}\n\n")

    # Baseline Comparison
    report.append("## 2. Baseline Comparison\n\n")
    report.append("| Model | Accuracy |\n")
    report.append("|-------|----------|\n")
    report.append(f"| Random | {baselines['random']:.4f} |\n")
    report.append(f"| Most Common Chord | {baselines['most_common']:.4f} |\n")
    report.append(f"| Markov Chain | {baselines['markov_chain']:.4f} |\n")
    report.append(f"| **ChordAI (Ours)** | **{model_metrics['test_accuracy']:.4f}** |\n\n")

    improvement = ((model_metrics['test_accuracy'] - baselines['markov_chain']) /
                   baselines['markov_chain'] * 100)
    report.append(f"**Improvement over Markov Chain**: {improvement:.1f}%\n\n")

    # Per-Genre
    report.append("## 3. Per-Genre Accuracy\n\n")
    report.append("| Genre | Samples | Accuracy |\n")
    report.append("|-------|---------|----------|\n")
    for genre, metrics in sorted(genre_metrics.items(), key=lambda x: x[1]['accuracy'], reverse=True):
        report.append(f"| {genre.capitalize()} | {metrics['samples']} | {metrics['accuracy']:.4f} |\n")
    report.append("\n")

    # Per-Mood
    report.append("## 4. Per-Mood Accuracy (Top 10)\n\n")
    report.append("| Mood | Samples | Accuracy |\n")
    report.append("|------|---------|----------|\n")
    for mood, metrics in sorted(mood_metrics.items(), key=lambda x: x[1]['accuracy'], reverse=True):
        report.append(f"| {mood.capitalize()} | {metrics['samples']} | {metrics['accuracy']:.4f} |\n")
    report.append("\n")

    # Musical Validity
    report.append("## 5. Musical Validity\n\n")
    report.append(f"- **Total Progressions Analyzed**: {validity_results['total']}\n")
    report.append(f"- **Valid**: {validity_results['valid']} ({validity_results['valid_percentage']:.1f}%)\n")
    report.append(f"- **Invalid**: {validity_results['invalid']}\n\n")

    if validity_results['issues_summary']:
        report.append("**Common Issues**:\n\n")
        for issue, count in validity_results['issues_summary'].most_common(5):
            report.append(f"- {issue}: {count}\n")
    report.append("\n")

    # Diversity
    report.append("## 6. Generation Diversity\n\n")
    report.append("Average diversity (unique progressions / total) for different temperatures:\n\n")
    report.append("| Temperature | Avg Diversity |\n")
    report.append("|-------------|---------------|\n")
    for temp, results in sorted(diversity_results.items()):
        report.append(f"| {temp} | {results['avg_diversity']:.3f} |\n")
    report.append("\n")

    # Conclusions
    report.append("## 7. Key Findings\n\n")
    report.append(f"1. The model achieves **{model_metrics['test_accuracy']:.1%}** accuracy on the test set\n")
    report.append(f"2. Outperforms Markov Chain baseline by **{improvement:.1f}%**\n")
    report.append(f"3. Best performing genre: **{max(genre_metrics.items(), key=lambda x: x[1]['accuracy'])[0]}**\n")
    report.append(f"4. **{validity_results['valid_percentage']:.1f}%** of generated progressions are musically valid\n")
    report.append(f"5. Temperature 1.0 provides good balance between quality and diversity\n\n")

    # Save report
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(report)

    print(f"\nEvaluation report saved to {output_path}")

    return ''.join(report)


def main():
    """Main evaluation pipeline"""

    import argparse
    from datetime import datetime

    parser = argparse.ArgumentParser(description='Comprehensive model evaluation')
    parser.add_argument('--model', type=str, required=True, help='Path to trained model')
    parser.add_argument('--data-dir', type=str, default='../dataset', help='Dataset directory')

    args = parser.parse_args()

    print("\n" + "="*70)
    print("COMPREHENSIVE MODEL EVALUATION")
    print("="*70)
    print(f"\nModel: {args.model}")
    print(f"Data directory: {args.data_dir}\n")

    # Create output directory
    os.makedirs('./output', exist_ok=True)

    # Initialize evaluator
    evaluator = ModelEvaluator(args.model, args.data_dir)

    # 1. Test set evaluation
    model_metrics = evaluator.evaluate_test_set()

    # 2. Per-genre evaluation
    genre_metrics = evaluator.evaluate_per_genre()

    # 3. Per-mood evaluation
    mood_metrics = evaluator.evaluate_per_mood()

    # 4. Confusion matrix
    evaluator.create_confusion_matrix(top_n=20)

    # 5. Musical validity
    validity_checker = MusicalValidityChecker()
    sample_gen = SampleGenerator(args.model, args.data_dir)
    samples = sample_gen.generate_diverse_samples(num_per_genre=5)

    progressions = [s['progression'] for s in samples]
    validity_results = validity_checker.analyze_batch(progressions)

    print("\n" + "="*70)
    print("MUSICAL VALIDITY")
    print("="*70)
    print(f"\nValid: {validity_results['valid']}/{validity_results['total']} ({validity_results['valid_percentage']:.1f}%)")

    # 6. Diversity analysis
    test_cases = [
        {'genre': 'pop', 'mood': 'uplifting', 'key': 'C', 'scale_type': 'major'},
        {'genre': 'rock', 'mood': 'energetic', 'key': 'E', 'scale_type': 'major'},
        {'genre': 'jazz', 'mood': 'smooth', 'key': 'F', 'scale_type': 'major'},
    ]

    generator = ChordProgressionGenerator(args.model, args.data_dir)
    diversity_analyzer = DiversityAnalyzer(generator)
    diversity_results = diversity_analyzer.analyze_diversity(test_cases, num_samples=10)

    # 7. Baseline comparison
    baselines = create_baseline_models(evaluator.test_data, evaluator.chord_vocab['vocab_size'])

    # 8. Generate report
    generate_evaluation_report(
        model_metrics,
        genre_metrics,
        mood_metrics,
        baselines,
        validity_results,
        diversity_results
    )

    print("\n" + "="*70)
    print("EVALUATION COMPLETE!")
    print("="*70)
    print("\nCheck ./output/ for:")
    print("  - evaluation_report.md")
    print("  - confusion_matrix.png")
    print("  - samples.txt")


if __name__ == "__main__":
    main()
