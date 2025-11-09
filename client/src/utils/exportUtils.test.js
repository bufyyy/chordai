import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportAsTxt,
  exportAsJson,
  generateShareUrl,
  decodeProgressionFromUrl,
  copyChords,
} from './exportUtils';

describe('exportUtils', () => {
  describe('exportAsTxt', () => {
    it('should export progression as formatted text', () => {
      const progression = {
        chords: ['C', 'G', 'Am', 'F'],
        romanNumerals: ['I', 'V', 'vi', 'IV'],
        metadata: {
          genre: 'pop',
          mood: 'uplifting',
          key: 'C',
          scaleType: 'major',
          timestamp: '2025-01-01T00:00:00.000Z',
        },
      };

      const result = exportAsTxt(progression);

      expect(result).toContain('ChordAI - Generated Progression');
      expect(result).toContain('C - G - Am - F');
      expect(result).toContain('I - V - vi - IV');
      expect(result).toContain('Genre: pop');
      expect(result).toContain('Mood: uplifting');
      expect(result).toContain('Key: C major');
    });

    it('should handle progression without roman numerals', () => {
      const progression = {
        chords: ['C', 'G'],
        metadata: { genre: 'rock' },
      };

      const result = exportAsTxt(progression);

      expect(result).toContain('C - G');
      expect(result).not.toContain('Roman Numerals');
    });
  });

  describe('exportAsJson', () => {
    it('should export progression as formatted JSON', () => {
      const progression = {
        chords: ['C', 'G', 'Am', 'F'],
        metadata: { genre: 'pop' },
      };

      const result = exportAsJson(progression);
      const parsed = JSON.parse(result);

      expect(parsed.chords).toEqual(['C', 'G', 'Am', 'F']);
      expect(parsed.metadata.genre).toBe('pop');
    });

    it('should format JSON with proper indentation', () => {
      const progression = { chords: ['C'] };
      const result = exportAsJson(progression);

      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });
  });

  describe('generateShareUrl', () => {
    beforeEach(() => {
      // Mock window.location
      delete window.location;
      window.location = { origin: 'https://chordai.app' };
    });

    it('should generate encoded share URL', () => {
      const progression = {
        chords: ['C', 'G', 'Am', 'F'],
        metadata: {
          genre: 'pop',
          mood: 'uplifting',
          key: 'C',
          scaleType: 'major',
        },
      };

      const url = generateShareUrl(progression);

      expect(url).toContain('https://chordai.app?p=');
      expect(url.length).toBeGreaterThan(30);
    });

    it('should handle encoding errors gracefully', () => {
      const badProgression = {
        chords: ['C'],
        metadata: {
          circular: {},
        },
      };
      // Create circular reference
      badProgression.metadata.circular = badProgression;

      const url = generateShareUrl(badProgression);

      expect(url).toBeNull();
    });
  });

  describe('decodeProgressionFromUrl', () => {
    beforeEach(() => {
      // Mock window.location.search
      delete window.location;
      window.location = { search: '' };
    });

    it('should decode progression from URL parameter', () => {
      const original = {
        c: ['C', 'G', 'Am', 'F'],
        g: 'pop',
        m: 'uplifting',
        k: 'C',
        s: 'major',
      };

      const encoded = btoa(JSON.stringify(original));
      window.location.search = `?p=${encoded}`;

      const result = decodeProgressionFromUrl();

      expect(result).not.toBeNull();
      expect(result.chords).toEqual(['C', 'G', 'Am', 'F']);
      expect(result.metadata.genre).toBe('pop');
      expect(result.metadata.mood).toBe('uplifting');
      expect(result.metadata.key).toBe('C');
      expect(result.metadata.scaleType).toBe('major');
      expect(result.metadata.source).toBe('shared_url');
    });

    it('should return null when no parameter present', () => {
      window.location.search = '';

      const result = decodeProgressionFromUrl();

      expect(result).toBeNull();
    });

    it('should return null on invalid encoded data', () => {
      window.location.search = '?p=invalid_base64';

      const result = decodeProgressionFromUrl();

      expect(result).toBeNull();
    });
  });

  describe('copyChords', () => {
    beforeEach(() => {
      // Mock clipboard API
      global.navigator.clipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should copy chords to clipboard', async () => {
      const progression = {
        chords: ['C', 'G', 'Am', 'F'],
      };

      await copyChords(progression);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('C - G - Am - F');
    });

    it('should use fallback for unsupported browsers', async () => {
      // Remove clipboard API
      delete global.navigator.clipboard;

      // Mock document methods
      const mockTextArea = {
        value: '',
        style: {},
        select: vi.fn(),
      };
      document.createElement = vi.fn().mockReturnValue(mockTextArea);
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
      document.execCommand = vi.fn().mockReturnValue(true);

      const progression = { chords: ['C', 'G'] };

      await copyChords(progression);

      expect(document.createElement).toHaveBeenCalledWith('textarea');
      expect(mockTextArea.value).toBe('C - G');
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty chord arrays', () => {
      const progression = {
        chords: [],
        metadata: {},
      };

      const txt = exportAsTxt(progression);
      expect(txt).toContain('Chords: ');
    });

    it('should handle missing metadata gracefully', () => {
      const progression = {
        chords: ['C', 'G'],
      };

      const txt = exportAsTxt(progression);
      expect(txt).toContain('Genre: N/A');
    });

    it('should handle special characters in chords', () => {
      const progression = {
        chords: ['C#m7', 'Dbadd9', 'Fb/G'],
        metadata: {},
      };

      const json = exportAsJson(progression);
      const parsed = JSON.parse(json);

      expect(parsed.chords).toEqual(['C#m7', 'Dbadd9', 'Fb/G']);
    });
  });
});
