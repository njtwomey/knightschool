import type { UnitState } from '@knightschool/core';
import { Circle, CircleCheck, CircleDot, GraduationCap, Lock } from 'lucide-react';

/** How each state of a unit is named, drawn and explained. */
export const STATE: Record<UnitState, { name: string; icon: typeof Lock; blurb: string }> = {
  locked: { name: 'Locked', icon: Lock, blurb: 'Pass the unit it grows from first.' },
  unlocked: { name: 'Ready', icon: Circle, blurb: 'Nothing studied yet. Learn it next.' },
  learning: { name: 'Learning', icon: CircleDot, blurb: 'Some moves are in your quiz, not all of them sure yet.' },
  passed: { name: 'Passed', icon: CircleCheck, blurb: 'Every move right in each of its last two answers.' },
  graduated: { name: 'Graduated', icon: GraduationCap, blurb: 'Every move is now asked a week or more apart.' },
};
