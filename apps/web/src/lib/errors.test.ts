import { describe, expect, it } from 'vitest';
import { errorText } from './errors';

describe('errorText', () => {
  it("gives an Error's message, or anything else as text", () => {
    expect(errorText(new Error('No such course'))).toBe('No such course');
    expect(errorText('offline')).toBe('offline');
    expect(errorText(404)).toBe('404');
  });
});
