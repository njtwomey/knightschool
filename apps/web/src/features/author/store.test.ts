import { contributionYaml, courseUnits, readChapter } from '@knightschool/core';
import { openMemoryStorage } from '@knightschool/storage/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const memory = await openMemoryStorage();
vi.mock('@/data/storage', () => ({ whenStorageReady: () => Promise.resolve(memory) }));
// No shipped content: the authored course stands alone.
vi.stubGlobal('fetch', (url: string) => {
  const file = url.split('/').at(-1)!;
  const body = file === 'index.json' || file === 'chapters.json' ? [] : null;
  return Promise.resolve({ ok: body !== null, status: 404, json: () => Promise.resolve(body) });
});

const { draftCourses, fullLine, useAuthor } = await import('./store');
const author = () => useAuthor.getState();
const chapterPgn = async (id: string) => (await memory.storage.authoring.chapters()).find((row) => row.id === id);
const play = async (...ucis: string[]) => {
  for (const uci of ucis) await author().playMove(uci);
};
const sansOf = (id: string | null) => fullLine(author().build, id)?.game.moves.map((move) => move.san);

describe('writing a course in the editor', () => {
  beforeAll(async () => {
    await author().load();
    await author().createCourse({ name: 'My Italian', side: 'white' });
  });

  it('makes a course with an empty main line, and plays moves onto it', async () => {
    expect(author().courseId).toBe('my-italian');
    expect(author().lineId).toBe('my-italian-main');
    // A course of its own unless it says otherwise: no opening of the app is needed.
    expect(draftCourses(author().rows)[0]!.manifest.opening).toBe('my-white-courses');
    await play('e2e4', 'e7e5', 'g1f3', 'b8c6');
    expect(sansOf('my-italian-main')).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(author().ply).toBe(4);
    expect(author().build!.problems).toEqual([]);
    expect(readChapter((await chapterPgn('my-italian-main'))!.pgn).tags.Opponent).toBe('1...e5');
  });

  it('steps along the line, and asks for a branch to play a different move', async () => {
    author().setPly(2);
    await play('g1f3');
    expect(author().ply).toBe(3);
    author().setPly(2);
    await play('f2f4');
    expect(author().message?.text).toMatch(/choose Branch/);
    expect(sansOf('my-italian-main')).toHaveLength(4);
  });

  it('branches from a position into a new line that grows from it', async () => {
    author().setPly(2);
    author().startBranch();
    await play('f2f4', 'e5f4');
    const branch = author().lineId!;
    expect(branch).not.toBe('my-italian-main');
    expect(sansOf(branch)).toEqual(['e4', 'e5', 'f4', 'exf4']);
    expect(readChapter((await chapterPgn(branch))!.pgn).tags).toMatchObject({
      Start: 'my-italian-main 1...e5',
      Variation: 'Main line, 2.f4',
      Opponent: '1...e5',
    });
    const course = draftCourses(author().rows)[0]!;
    // 2.f4 is a second answer to the position after 1...e5, so it is shown but not drilled.
    expect(course.manifest.lines).toEqual(['my-italian-main', { id: branch, alternative: true }]);
    expect(author().build!.problems).toEqual([]);
  });

  it('notes and tags a move, pictures the line, and puts it in a group', async () => {
    const branch = author().lineId!;
    author().setPly(3);
    await author().setNote('Offers a pawn for the centre.', ['tip', 'trap', 'King gambit']);
    await author().setSnapshot(3);
    await author().setGroup('Gambits');
    const game = readChapter((await chapterPgn(branch))!.pgn);
    expect(game.moves[0]).toMatchObject({
      san: 'f4',
      comment: 'Offers a pawn for the centre.',
      tags: ['tip', 'trap', 'king-gambit'],
    });
    expect(game.tags.Snapshot).toBe('3');
    expect(draftCourses(author().rows)[0]!.manifest.lines[1]).toEqual({
      id: branch,
      alternative: true,
      section: 'Gambits',
    });
    const content = author().build!.courses[0]!;
    expect(content.opening.variants.find((variant) => variant.id === branch)).toMatchObject({
      snapshot: 3,
      section: 'Gambits',
    });
  });

  it('deletes a line with what grows from it, and undo brings both back', async () => {
    const branch = author().lineId!;
    author().selectLine('my-italian-main');
    await author().deleteLine();
    expect(author().message).toMatchObject({ undo: true, text: expect.stringMatching(/and 1 that grew from it/) });
    expect((await chapterPgn('my-italian-main'))!.deletedAt).not.toBeNull();
    expect((await chapterPgn(branch))!.deletedAt).not.toBeNull();
    await author().undo();
    expect((await chapterPgn('my-italian-main'))!.deletedAt).toBeNull();
    expect((await chapterPgn(branch))!.deletedAt).toBeNull();
    expect(draftCourses(author().rows)[0]!.manifest.lines).toHaveLength(2);
    expect(author().build!.problems).toEqual([]);
  });

  it('renames and deletes a group, keeping its lines', async () => {
    await author().renameGroup('Gambits', 'Sharp');
    expect(draftCourses(author().rows)[0]!.manifest.lines[1]).toMatchObject({ section: 'Sharp' });
    await author().deleteGroup('Sharp');
    expect(draftCourses(author().rows)[0]!.manifest.lines).toHaveLength(2);
    expect(draftCourses(author().rows)[0]!.manifest.lines[1]).not.toHaveProperty('section');
  });

  it('publishes the course as a contribution, and imports it back', async () => {
    const contribution = author().contribution('my-italian');
    expect(contribution.chapters.map((chapter) => chapter.id)).toHaveLength(2);
    const yaml = contributionYaml(contribution);
    await author().deleteCourse();
    expect(draftCourses(author().rows)).toEqual([]);
    expect(await author().importContribution(yaml)).toBeNull();
    expect(author().courseId).toBe('my-italian');
    expect(draftCourses(author().rows)[0]!.manifest.lines).toHaveLength(2);
    expect(author().build!.problems).toEqual([]);
    expect(contributionYaml(author().contribution('my-italian'))).toBe(yaml);
    expect(await author().importContribution('nope: 1')).toMatch(/not a Knight School contribution/);
  });

  it('orders the path, moves a line to the bonus and back, and undo takes a change back', async () => {
    const lines = () => draftCourses(author().rows)[0]!.manifest.lines;
    const ids = () => lines().map((entry) => (typeof entry === 'string' ? entry : entry.id));
    const f4 = ids()[1]!; // the alternative 2.f4, in the bonus
    // A second line on the path: Black's 2...Nf6, branching from the main line.
    author().selectLine('my-italian-main');
    author().setPly(3);
    author().startBranch();
    await play('g8f6');
    const nf6 = author().lineId!;
    expect(ids()).toEqual(['my-italian-main', nf6, f4]);

    // Study 2...Nf6 first: the lines are written in that order, and the path starts with it.
    expect(await author().setPath([nf6, 'my-italian-main'], [f4])).toBeNull();
    expect(ids()).toEqual([nf6, 'my-italian-main', f4]);
    expect(courseUnits(author().build!.courses[0]!)[0]!.line).toBe(nf6);
    expect(author().build!.problems).toEqual([]);

    // The default order writes no units.order.
    expect(await author().setPath(['my-italian-main', nf6], [f4])).toBeNull();
    expect(draftCourses(author().rows)[0]!.manifest.units).toBeUndefined();

    // To the bonus and back: an alternative, then not.
    expect(await author().setPath(['my-italian-main'], [f4, nf6])).toBeNull();
    expect(lines()[2]).toMatchObject({ id: nf6, alternative: true });
    expect(await author().setPath(['my-italian-main', nf6], [f4])).toBeNull();
    expect(lines()[1]).toBe(nf6);

    // 2.f4 on the path would give the position after 1...e5 two answers: the build's problem, nothing saved.
    const before = JSON.stringify(lines());
    expect(await author().setPath(['my-italian-main', nf6, f4], [])).toMatch(/two repertoire moves/);
    expect(JSON.stringify(lines())).toBe(before);

    // Undo takes back the last change of order.
    await author().setPath([nf6, 'my-italian-main'], [f4]);
    await author().undo();
    expect(ids()).toEqual(['my-italian-main', nf6, f4]);
  });

  it('adds, renames, copies and deletes a line, naming each change Undo would take back', async () => {
    const ids = () =>
      draftCourses(author().rows)[0]!.manifest.lines.map((entry) => (typeof entry === 'string' ? entry : entry.id));
    const before = ids();
    const added = (await author().createLine())!;
    expect(ids()).toEqual([...before, added]);
    expect(author().undoLabel).toBe(`make line Line ${before.length + 1}`);
    await author().renameLine(added, 'Quiet line');
    expect(readChapter((await chapterPgn(added))!.pgn).tags.Variation).toBe('Quiet line');
    expect(author().undoLabel).toBe('change to line Quiet line');
    const copy = (await author().duplicateLine(added))!;
    expect(ids()).toEqual([...before, added, copy]);
    expect(readChapter((await chapterPgn(copy))!.pgn).tags.Variation).toBe('Quiet line (copy)');
    await author().deleteLine(copy);
    expect(ids()).toEqual([...before, added]);
    expect(author().undoLabel).toBe('delete line Quiet line (copy)');
    await author().undo();
    expect(ids()).toEqual([...before, added, copy]);
  });

  it('copies a course with its lines, and deletes a course that undo brings back', async () => {
    const copyId = (await author().duplicateCourse('my-italian'))!;
    const copy = draftCourses(author().rows).find((course) => course.id === copyId)!;
    expect(copy.manifest.name).toBe('My Italian (copy)');
    const original = draftCourses(author().rows).find((course) => course.id === 'my-italian')!;
    expect(copy.manifest.lines).toHaveLength(original.manifest.lines.length);
    // A copied branch grows from the copy of its parent, so the copy builds on its own.
    expect(author().build!.problems).toEqual([]);
    const copiedLines = copy.manifest.lines.map((entry) => (typeof entry === 'string' ? entry : entry.id));
    const originalLines = original.manifest.lines.map((entry) => (typeof entry === 'string' ? entry : entry.id));
    expect(copiedLines.some((id) => originalLines.includes(id))).toBe(false);
    await author().deleteCourse(copyId);
    expect(draftCourses(author().rows).map((course) => course.id)).toEqual(['my-italian']);
    expect(author().undoLabel).toBe('delete course My Italian (copy)');
    await author().undo();
    expect(
      draftCourses(author().rows)
        .map((course) => course.id)
        .sort(),
    ).toEqual(['my-italian', copyId].sort());
    expect(author().build!.problems).toEqual([]);
  });
});
