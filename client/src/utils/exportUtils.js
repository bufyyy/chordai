/**
 * Export utilities for chord progressions
 * Supports TXT, JSON, MIDI, PNG, and URL sharing
 */

/**
 * Export progression as plain text
 */
export function exportAsTxt(progression) {
  const { chords, metadata } = progression;

  let text = '=== ChordAI - Generated Progression ===\n\n';
  text += `Chords: ${chords.join(' - ')}\n`;

  if (progression.romanNumerals) {
    text += `Roman Numerals: ${progression.romanNumerals.join(' - ')}\n`;
  }

  text += `\nMetadata:\n`;
  text += `  Genre: ${metadata.genre || 'N/A'}\n`;
  text += `  Mood: ${metadata.mood || 'N/A'}\n`;
  text += `  Key: ${metadata.key || 'N/A'} ${metadata.scaleType || ''}\n`;
  text += `  Generated: ${new Date(metadata.timestamp || Date.now()).toLocaleString()}\n`;

  if (metadata.originalName) {
    text += `  Source: ${metadata.originalName}\n`;
  }

  text += '\n=== Generated with ChordAI ===\n';
  text += 'https://chordai.app\n';

  return text;
}

/**
 * Export progression as JSON
 */
export function exportAsJson(progression) {
  return JSON.stringify(progression, null, 2);
}

/**
 * Download file helper
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download progression as TXT
 */
export function downloadAsTxt(progression) {
  const content = exportAsTxt(progression);
  const filename = `chordai-progression-${Date.now()}.txt`;
  downloadFile(content, filename, 'text/plain');
}

/**
 * Download progression as JSON
 */
export function downloadAsJson(progression) {
  const content = exportAsJson(progression);
  const filename = `chordai-progression-${Date.now()}.json`;
  downloadFile(content, filename, 'application/json');
}

/**
 * Export progression as MIDI file
 * Simplified version - creates a basic MIDI sequence
 */
export function exportAsMidi(progression) {
  // This is a placeholder for MIDI export
  // In a real implementation, you would use a library like 'midi-writer-js'
  // or 'tone.js' MIDI export functionality

  console.warn('MIDI export is not fully implemented yet');

  // For now, just download as JSON with MIDI extension
  const content = JSON.stringify({
    format: 'ChordAI-MIDI-JSON',
    progression: progression,
    note: 'This is a JSON representation. Full MIDI export coming soon.',
  }, null, 2);

  const filename = `chordai-progression-${Date.now()}.mid.json`;
  downloadFile(content, filename, 'application/json');
}

/**
 * Generate shareable URL with encoded progression
 */
export function generateShareUrl(progression) {
  try {
    const data = {
      c: progression.chords,
      g: progression.metadata.genre,
      m: progression.metadata.mood,
      k: progression.metadata.key,
      s: progression.metadata.scaleType,
    };

    const encoded = btoa(JSON.stringify(data));
    const baseUrl = window.location.origin;
    return `${baseUrl}?p=${encoded}`;
  } catch (error) {
    console.error('Error generating share URL:', error);
    return null;
  }
}

/**
 * Decode progression from URL
 */
export function decodeProgressionFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('p');

    if (!encoded) return null;

    const decoded = JSON.parse(atob(encoded));
    return {
      chords: decoded.c,
      metadata: {
        genre: decoded.g,
        mood: decoded.m,
        key: decoded.k,
        scaleType: decoded.s,
        source: 'shared_url',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error decoding progression from URL:', error);
    return null;
  }
}

/**
 * Copy share URL to clipboard
 */
export async function copyShareUrl(progression) {
  const url = generateShareUrl(progression);

  if (!url) {
    throw new Error('Failed to generate share URL');
  }

  try {
    await navigator.clipboard.writeText(url);
    return url;
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return url;
    } catch (err) {
      document.body.removeChild(textArea);
      throw new Error('Failed to copy to clipboard');
    }
  }
}

/**
 * Copy progression chords to clipboard
 */
export async function copyChords(progression) {
  const text = progression.chords.join(' - ');

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      document.body.removeChild(textArea);
      throw new Error('Failed to copy to clipboard');
    }
  }
}

/**
 * Export progression as PNG image
 * Creates a canvas with chord progression visualization
 */
export function exportAsPng(progression) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Canvas dimensions
  const width = 1200;
  const height = 630; // Good for social media sharing
  canvas.width = width;
  canvas.height = height;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add some decorative elements
  ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
  ctx.beginPath();
  ctx.arc(width * 0.2, height * 0.3, 200, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.7, 250, 0, Math.PI * 2);
  ctx.fill();

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ChordAI', width / 2, 80);

  // Subtitle
  ctx.fillStyle = '#a0aec0';
  ctx.font = '24px sans-serif';
  ctx.fillText('AI-Generated Chord Progression', width / 2, 120);

  // Chords
  const chords = progression.chords;
  const chordBoxWidth = 140;
  const chordBoxHeight = 100;
  const spacing = 20;
  const totalWidth = chords.length * (chordBoxWidth + spacing) - spacing;
  const startX = (width - totalWidth) / 2;
  const startY = 250;

  chords.forEach((chord, idx) => {
    const x = startX + idx * (chordBoxWidth + spacing);

    // Chord box
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, startY, chordBoxWidth, chordBoxHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Chord name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(chord, x + chordBoxWidth / 2, startY + chordBoxHeight / 2 + 12);

    // Roman numeral (if available)
    if (progression.romanNumerals && progression.romanNumerals[idx]) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText(progression.romanNumerals[idx], x + chordBoxWidth / 2, startY + chordBoxHeight - 15);
    }
  });

  // Metadata
  const metadata = progression.metadata || {};
  ctx.fillStyle = '#cbd5e0';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';

  const metaY = startY + chordBoxHeight + 80;
  const metaText = [
    metadata.genre && `Genre: ${metadata.genre}`,
    metadata.mood && `Mood: ${metadata.mood}`,
    metadata.key && `Key: ${metadata.key} ${metadata.scaleType || ''}`,
  ]
    .filter(Boolean)
    .join('  •  ');

  ctx.fillText(metaText, width / 2, metaY);

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '18px sans-serif';
  ctx.fillText('Generated with ChordAI  •  chordai.app', width / 2, height - 40);

  // Download
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chordai-progression-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

/**
 * Export progression as PDF
 * Uses canvas to create PDF-style image
 */
export function exportAsPdf(progression) {
  // For a real PDF, you would use a library like jsPDF
  // For now, we'll export a high-quality PNG that can be printed

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // A4 size at 300 DPI
  const width = 2480;
  const height = 3508;
  canvas.width = width;
  canvas.height = height;

  // White background for printing
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#1a202c';
  ctx.font = 'bold 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Chord Progression', width / 2, 200);

  // Chords (large format for readability)
  const chords = progression.chords;
  const chordSpacing = 180;
  const startY = 500;

  chords.forEach((chord, idx) => {
    const y = startY + idx * chordSpacing;

    // Number
    ctx.fillStyle = '#718096';
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${idx + 1}.`, width / 2 - 300, y);

    // Chord
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(chord, width / 2 - 200, y);

    // Roman numeral
    if (progression.romanNumerals && progression.romanNumerals[idx]) {
      ctx.fillStyle = '#a0aec0';
      ctx.font = '48px sans-serif';
      ctx.fillText(`(${progression.romanNumerals[idx]})`, width / 2 + 200, y);
    }
  });

  // Metadata section
  const metadata = progression.metadata || {};
  const metaY = startY + chords.length * chordSpacing + 200;

  ctx.fillStyle = '#4a5568';
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'left';

  const metaX = width / 2 - 400;
  let currentY = metaY;

  if (metadata.genre) {
    ctx.fillText(`Genre: ${metadata.genre}`, metaX, currentY);
    currentY += 80;
  }

  if (metadata.mood) {
    ctx.fillText(`Mood: ${metadata.mood}`, metaX, currentY);
    currentY += 80;
  }

  if (metadata.key) {
    ctx.fillText(`Key: ${metadata.key} ${metadata.scaleType || ''}`, metaX, currentY);
    currentY += 80;
  }

  // Footer
  ctx.fillStyle = '#a0aec0';
  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Generated with ChordAI', width / 2, height - 200);
  ctx.fillText('https://chordai.app', width / 2, height - 120);

  // Download as PNG (print-ready)
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chordai-progression-print-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

export default {
  exportAsTxt,
  exportAsJson,
  downloadAsTxt,
  downloadAsJson,
  exportAsMidi,
  exportAsPng,
  exportAsPdf,
  generateShareUrl,
  decodeProgressionFromUrl,
  copyShareUrl,
  copyChords,
};
