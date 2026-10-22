import { create } from 'zustand';
import { sliceContext } from './context';
import { contributionSlice } from './contribution-slice';
import { courseSlice } from './course-slice';
import { groupSlice } from './group-slice';
import { lineSlice } from './line-slice';
import { moveSlice } from './move-slice';
import { pathSlice } from './path-slice';
import { sessionSlice } from './session-slice';
import type { AuthorState } from './types';

export type { AuthorState } from './types';

/** The course editor: your authored courses and lines, what is open, and every change as one undoable action. */
export const useAuthor = create<AuthorState>((set, get) => {
  const context = sliceContext(set, get);
  return {
    ...sessionSlice(context),
    ...courseSlice(context),
    ...lineSlice(context),
    ...moveSlice(context),
    ...groupSlice(context),
    ...pathSlice(context),
    ...contributionSlice(context),
  };
});
