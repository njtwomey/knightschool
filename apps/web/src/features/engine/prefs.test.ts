import { describe, expect, it } from 'vitest';
import { parseEnginePrefs } from './prefs';

describe('parseEnginePrefs', () => {
  it('is on by default, and when the saved value is missing or damaged', () => {
    expect(parseEnginePrefs(null)).toEqual({ auto: true });
    expect(parseEnginePrefs('not json')).toEqual({ auto: true });
    expect(parseEnginePrefs('{"auto":"no"}')).toEqual({ auto: true });
    expect(parseEnginePrefs('42')).toEqual({ auto: true });
  });

  it('is off only when it was explicitly turned off', () => {
    expect(parseEnginePrefs('{"auto":false}')).toEqual({ auto: false });
    expect(parseEnginePrefs('{"auto":true}')).toEqual({ auto: true });
  });
});
