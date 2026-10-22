import { BookOpen, GitBranch, Target } from 'lucide-react';
import type { PlayMode } from './store';

/** How each way of playing a line is named and described. */
export const MODES: Record<PlayMode, { name: string; blurb: string; icon: typeof BookOpen }> = {
  learn: { name: 'Learn', blurb: 'You play both sides. Every move is shown first.', icon: BookOpen },
  drill: { name: 'Drill', blurb: 'The computer plays the other side. Recall your moves.', icon: Target },
  branches: {
    name: 'Every branch',
    blurb: 'The computer varies its replies each time. Know the answer to every one.',
    icon: GitBranch,
  },
};
