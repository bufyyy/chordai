# ChordAI - Quick Start Guide

Bu rehber, veri setini oluşturmak ve ML eğitimi için hazırlamak için gereken tüm adımları içerir.

## Tüm Pipeline'ı Tek Komutla Çalıştırma

### Windows PowerShell:
```powershell
cd C:\Users\ibugr\Desktop\chordai

# 1. Veri toplama
cd data-collection
python generate_base_dataset.py
python augment_transposition.py
python augment_variations.py

# 2. Veri analizi (opsiyonel)
python analyze_dataset.py

# 3. Preprocessing
cd ..\model-training
python data_preprocessing.py

# 4. İstatistikler (opsiyonel)
python data_statistics.py
```

## Adım Adım Detaylı Rehber

### Adım 1: Base Dataset Oluşturma
```bash
cd data-collection
python generate_base_dataset.py
```
**Çıktı**: `dataset/progressions.json` (30 progression)

### Adım 2: Transposition Augmentation
```bash
python augment_transposition.py
```
**Çıktı**: `dataset/progressions_augmented.json` (360 progression)

### Adım 3: Chord Variation Augmentation
```bash
python augment_variations.py
```
**Çıktı**: `dataset/progressions_final.json` (1,080 progression)

### Adım 4: Veri Analizi (Opsiyonel)
```bash
python analyze_dataset.py
```
Veri setinin detaylı analizini gösterir.

### Adım 5: ML Preprocessing
```bash
cd ..\model-training
python data_preprocessing.py
```
**Çıktı**:
- `dataset/chord_vocab.json`
- `dataset/metadata_vocab.json`
- `dataset/train.json` (864 samples)
- `dataset/val.json` (162 samples)
- `dataset/test.json` (54 samples)
- `dataset/preprocessing_metadata.json`

### Adım 6: Detaylı İstatistikler (Opsiyonel)
```bash
python data_statistics.py
```

### Adım 7: Jupyter Notebook ile İnceleme (Opsiyonel)
```bash
jupyter notebook data_inspection.ipynb
```

## Sonuç

Pipeline tamamlandıktan sonra elinizde şunlar olacak:

### Veri Setleri:
- **1,080 toplam progression** (30 base → 360 transposed → 1,080 final)
- **Train/Val/Test split**: 864 / 162 / 54

### Vocabulary Dosyaları:
- **279 unique chord** (275 chord + 4 special token)
- **8 genre**, **27 mood**, **24 key**, **2 scale type**

### Encoding:
- Her progression integer sequence olarak encode edildi
- Max 12 chord uzunluğuna padding yapıldı
- Metadata (genre, mood, key) encode edildi

## Veri Kalitesi

- Average progression length: **4.42 chords**
- Genre distribution: Pop 36.7%, Rock 16.7%, Jazz 16.7%
- Major/Minor: 79.7% / 20.3%
- Most common chords: F, A#, A, G, B, C

## Dosya Yapısı Özeti

```
/chordai
├── /data-collection
│   ├── generate_base_dataset.py      # 30 base pattern
│   ├── augment_transposition.py      # 12 tonaliteye transpose
│   ├── augment_variations.py         # Akor varyasyonları
│   └── analyze_dataset.py            # Veri analizi
│
├── /dataset
│   ├── progressions.json                 # 30 base
│   ├── progressions_augmented.json       # 360 transposed
│   ├── progressions_final.json           # 1,080 final
│   ├── chord_vocab.json                  # Chord vocabulary
│   ├── metadata_vocab.json               # Metadata vocabularies
│   ├── train.json                        # Training set (864)
│   ├── val.json                          # Validation set (162)
│   ├── test.json                         # Test set (54)
│   └── preprocessing_metadata.json       # Preprocessing info
│
├── /model-training
│   ├── data_preprocessing.py         # ML preprocessing pipeline
│   ├── data_statistics.py            # Detaylı istatistikler
│   └── data_inspection.ipynb         # Jupyter notebook
│
├── requirements.txt
├── README.md
└── QUICKSTART.md (bu dosya)
```

## Sonraki Adım: Model Eğitimi

Veri seti hazır! Artık ML model eğitimine başlayabilirsiniz:
- LSTM/Transformer model oluşturma
- Model eğitimi
- Evaluation ve testing
- Model export

## Troubleshooting

### Problem: "Module not found" hatası
**Çözüm**:
```bash
pip install -r requirements.txt
```

### Problem: Unicode encoding hatası (Windows)
**Çözüm**: Script içinde `#` karakterleri kullanıldı, sorun giderildi.

### Problem: Dosya bulunamadı
**Çözüm**: Doğru dizinde olduğunuzdan emin olun:
```bash
cd C:\Users\ibugr\Desktop\chordai
```

## İletişim ve Destek

Sorularınız için README.md dosyasını kontrol edin veya issue açın.

---
**Son Güncelleme**: Ekim 2025
**Status**: Data preprocessing tamamlandı ✓
