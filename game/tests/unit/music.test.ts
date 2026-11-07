import { describe, expect, it } from 'vitest';
import { noteFreq, trackForChapter } from '../../src/audio/Music';

describe('Music', () => {
  it('maps note names to equal-tempered frequencies', () => {
    expect(noteFreq('A4')).toBeCloseTo(440, 6);
    expect(noteFreq('A5')).toBeCloseTo(880, 6);
    expect(noteFreq('C4')).toBeCloseTo(261.6256, 3);
    expect(noteFreq('G#5')).toBeCloseTo(830.6094, 3);
  });

  it('picks a track per chapter', () => {
    expect(trackForChapter('bar')).toBe('bar');
    expect(trackForChapter('drive')).toBe('drive');
    expect(trackForChapter('house')).toBe('house');
    expect(trackForChapter('end')).toBe('end');
    expect(trackForChapter('unknown')).toBeNull();
  });
});
