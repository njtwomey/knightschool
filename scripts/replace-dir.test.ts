import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { replaceDir } from './replace-dir.ts';

describe('replaceDir', () => {
  let base: string;
  let out: string;
  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'replace-dir-'));
    out = join(base, 'public', 'content');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'index.json'), 'old');
    writeFileSync(join(out, 'gone.json'), 'old');
  });
  afterEach(() => rmSync(base, { recursive: true, force: true }));

  it('swaps in what the build wrote, and nothing of the old folder stays', async () => {
    await replaceDir(out, (dir) => writeFileSync(join(dir, 'index.json'), 'new'));
    expect(readdirSync(out)).toEqual(['index.json']);
    expect(readFileSync(join(out, 'index.json'), 'utf8')).toBe('new');
    expect(readdirSync(join(base, 'public'))).toEqual(['content']); // no staging folder left behind
  });

  it('leaves the old folder untouched when the build fails', async () => {
    await expect(
      replaceDir(out, (dir) => {
        writeFileSync(join(dir, 'index.json'), 'half');
        throw new Error('two comments on 5.Bxf7+');
      }),
    ).rejects.toThrow('two comments');
    expect(readdirSync(out).sort()).toEqual(['gone.json', 'index.json']);
    expect(readFileSync(join(out, 'index.json'), 'utf8')).toBe('old');
    expect(readdirSync(join(base, 'public'))).toEqual(['content']);
  });

  it('makes the folder when there was none, staging elsewhere if asked', async () => {
    const fresh = join(base, 'new', 'content');
    const staging = join(base, 'cache');
    await replaceDir(fresh, async (dir) => writeFileSync(join(dir, 'a.json'), '1'), staging);
    expect(readdirSync(fresh)).toEqual(['a.json']);
    expect(readdirSync(staging)).toEqual([]);
  });
});
