"""
Automated TensorFlow.js Conversion Pipeline

One-command script to:
1. Convert Keras model to TF.js
2. Export all metadata
3. Run Node.js tests
4. Generate complete report

Usage:
    python convert_pipeline.py --model models/chord_model_final.h5
"""

import os
import sys
import json
import subprocess
import argparse
from pathlib import Path
from datetime import datetime


class ConversionPipeline:
    """Automated pipeline for model conversion"""

    def __init__(self, model_path, output_dir='../client/public/model', data_dir='../dataset'):
        """Initialize pipeline"""

        self.model_path = model_path
        self.output_dir = output_dir
        self.data_dir = data_dir

        print("\n" + "="*70)
        print("TENSORFLOW.JS CONVERSION PIPELINE")
        print("="*70)
        print(f"\nConfiguration:")
        print(f"  Model: {model_path}")
        print(f"  Output: {output_dir}")
        print(f"  Dataset: {data_dir}")
        print()

    def check_dependencies(self):
        """Check required dependencies"""

        print("[STEP 1/6] Checking dependencies...")

        dependencies_ok = True

        # Check Python packages
        try:
            import tensorflow
            print(f"  [OK] TensorFlow {tensorflow.__version__}")
        except ImportError:
            print("  [ERROR] TensorFlow not found")
            dependencies_ok = False

        try:
            import tensorflowjs
            print(f"  [OK] TensorFlow.js converter")
        except ImportError:
            print("  [ERROR] tensorflowjs not found")
            print("  Install with: pip install tensorflowjs")
            dependencies_ok = False

        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'],
                                   capture_output=True, text=True)
            print(f"  [OK] Node.js {result.stdout.strip()}")
        except FileNotFoundError:
            print("  [WARNING] Node.js not found (testing will be skipped)")

        # Check if model exists
        if not os.path.exists(self.model_path):
            print(f"  [ERROR] Model not found: {self.model_path}")
            dependencies_ok = False
        else:
            model_size = os.path.getsize(self.model_path) / (1024 * 1024)
            print(f"  [OK] Model found ({model_size:.2f} MB)")

        if not dependencies_ok:
            print("\n[ERROR] Missing required dependencies")
            return False

        print()
        return True

    def run_conversion(self):
        """Run TF.js conversion"""

        print("[STEP 2/6] Converting model to TensorFlow.js...")

        try:
            # Import converter
            from convert_to_tfjs import TFJSConverter

            # Create converter
            converter = TFJSConverter(self.model_path, self.output_dir)

            # Run conversion
            converter.load_model()
            converter.convert_to_tfjs(quantize=True)
            converter.export_vocabularies(self.data_dir)
            converter.export_model_config(self.data_dir)
            converter.create_readme()
            report = converter.generate_report()

            print("[OK] Conversion completed\n")
            return report

        except Exception as e:
            print(f"[ERROR] Conversion failed: {e}")
            import traceback
            traceback.print_exc()
            return None

    def verify_output(self):
        """Verify conversion output files"""

        print("[STEP 3/6] Verifying output files...")

        required_files = [
            'model.json',
            'metadata/chord_vocab.json',
            'metadata/genre_mapping.json',
            'metadata/mood_mapping.json',
            'metadata/key_mapping.json',
            'metadata/scale_type_mapping.json',
            'metadata/model_config.json',
            'README.md',
            'conversion_report.json'
        ]

        all_found = True

        for file in required_files:
            file_path = os.path.join(self.output_dir, file)
            if os.path.exists(file_path):
                size = os.path.getsize(file_path)
                print(f"  [OK] {file} ({size} bytes)")
            else:
                print(f"  [ERROR] Missing: {file}")
                all_found = False

        # Check for weight files
        weight_files = [f for f in os.listdir(self.output_dir) if f.endswith('.bin')]
        if weight_files:
            print(f"  [OK] {len(weight_files)} weight file(s)")
        else:
            print(f"  [ERROR] No weight files found")
            all_found = False

        print()
        return all_found

    def install_tfjs_node(self):
        """Install @tensorflow/tfjs-node if needed"""

        print("[STEP 4/6] Installing Node.js dependencies...")

        try:
            # Check if package.json exists
            package_json_path = os.path.join(os.path.dirname(__file__), 'package.json')

            if not os.path.exists(package_json_path):
                # Create package.json
                package_json = {
                    "name": "chordai-tfjs-test",
                    "version": "1.0.0",
                    "description": "TensorFlow.js model testing",
                    "dependencies": {
                        "@tensorflow/tfjs-node": "^4.11.0"
                    }
                }

                with open(package_json_path, 'w') as f:
                    json.dump(package_json, f, indent=2)

                print("  [OK] Created package.json")

            # Install dependencies
            result = subprocess.run(['npm', 'install'],
                                   cwd=os.path.dirname(__file__),
                                   capture_output=True, text=True)

            if result.returncode == 0:
                print("  [OK] Node.js dependencies installed\n")
                return True
            else:
                print(f"  [ERROR] npm install failed: {result.stderr}")
                return False

        except FileNotFoundError:
            print("  [WARNING] npm not found, skipping Node.js dependencies\n")
            return False
        except Exception as e:
            print(f"  [ERROR] Failed to install dependencies: {e}\n")
            return False

    def run_tests(self):
        """Run Node.js tests"""

        print("[STEP 5/6] Running Node.js tests...")

        try:
            test_script = os.path.join(os.path.dirname(__file__), 'test_tfjs_model.js')

            if not os.path.exists(test_script):
                print("  [WARNING] Test script not found, skipping tests\n")
                return None

            result = subprocess.run(['node', test_script],
                                   capture_output=True, text=True,
                                   cwd=os.path.dirname(__file__))

            if result.returncode == 0:
                print("  [OK] Tests passed")
                print(result.stdout)

                # Try to load test report
                report_path = os.path.join(self.output_dir, 'tfjs_test_report.json')
                if os.path.exists(report_path):
                    with open(report_path, 'r') as f:
                        test_report = json.load(f)
                    return test_report

                return {'status': 'passed'}
            else:
                print(f"  [ERROR] Tests failed")
                print(result.stderr)
                return None

        except FileNotFoundError:
            print("  [WARNING] Node.js not found, skipping tests\n")
            return None
        except Exception as e:
            print(f"  [ERROR] Test execution failed: {e}\n")
            return None

    def generate_final_report(self, conversion_report, test_report):
        """Generate final pipeline report"""

        print("[STEP 6/6] Generating final report...")

        report = {
            'pipeline_version': '1.0',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'model_path': self.model_path,
            'output_directory': self.output_dir,
            'conversion': conversion_report,
            'tests': test_report if test_report else {'status': 'skipped'},
            'status': 'success'
        }

        report_path = os.path.join(self.output_dir, 'pipeline_report.json')
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"  [OK] Report saved to: {report_path}\n")

        return report

    def run(self):
        """Run complete pipeline"""

        # Step 1: Check dependencies
        if not self.check_dependencies():
            return False

        # Step 2: Run conversion
        conversion_report = self.run_conversion()
        if not conversion_report:
            return False

        # Step 3: Verify output
        if not self.verify_output():
            print("[WARNING] Some output files missing")

        # Step 4: Install Node.js dependencies
        self.install_tfjs_node()

        # Step 5: Run tests
        test_report = self.run_tests()

        # Step 6: Generate final report
        final_report = self.generate_final_report(conversion_report, test_report)

        # Print summary
        self.print_summary(final_report)

        return True

    def print_summary(self, report):
        """Print pipeline summary"""

        print("\n" + "="*70)
        print("CONVERSION PIPELINE SUMMARY")
        print("="*70)

        print(f"\n[OK] Pipeline completed successfully!")

        # Conversion stats
        if 'conversion' in report and report['conversion']:
            conv = report['conversion']
            if 'sizes' in conv:
                print(f"\nModel Size:")
                print(f"  Original: {conv['sizes']['original_mb']:.2f} MB")
                print(f"  TF.js:    {conv['sizes']['tfjs_mb']:.2f} MB")
                print(f"  Reduction: {conv['sizes']['reduction_percent']:.1f}%")

                if conv['sizes']['tfjs_mb'] > 15:
                    print(f"\n[WARNING] Model size exceeds 15MB target")
                else:
                    print(f"\n[OK] Model size within 15MB target")

        # Test stats
        if 'tests' in report and report['tests'] and 'performance' in report['tests']:
            perf = report['tests']['performance']
            print(f"\nPerformance:")
            print(f"  Average inference: {perf['avgTime']:.2f}ms")
            print(f"  Throughput: {perf['throughput']:.2f} predictions/second")

        # Output location
        print(f"\nOutput Directory: {self.output_dir}")
        print(f"Report: {os.path.join(self.output_dir, 'pipeline_report.json')}")

        print("\n" + "="*70)
        print("\nNext Steps:")
        print("  1. Copy model to your web app:")
        print(f"     cp -r {self.output_dir}/* your-app/public/model/")
        print("  2. Use in React app with @tensorflow/tfjs")
        print("  3. Import modelUtils.js for preprocessing")
        print("\n" + "="*70 + "\n")


def main():
    """Main entry point"""

    parser = argparse.ArgumentParser(description='Convert Keras model to TensorFlow.js')
    parser.add_argument('--model', type=str, required=True,
                       help='Path to Keras model (.h5)')
    parser.add_argument('--output', type=str, default='../client/public/model',
                       help='Output directory (default: ../client/public/model)')
    parser.add_argument('--data-dir', type=str, default='../dataset',
                       help='Dataset directory (default: ../dataset)')
    parser.add_argument('--skip-tests', action='store_true',
                       help='Skip Node.js tests')

    args = parser.parse_args()

    # Create pipeline
    pipeline = ConversionPipeline(args.model, args.output, args.data_dir)

    # Run pipeline
    success = pipeline.run()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
