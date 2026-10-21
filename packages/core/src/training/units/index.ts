// The study path: a course cut into units (docs/STUDY-PLAN.md).
export { checkUnitOverrides, courseUnits, cutIntoUnits, unitStretches } from './cut';
export { stretchPositions } from './extras';
export { planIntroductions, pathIntroductionOrder, type IntroductionSource } from './introductions';
export { fittingPlacements, lineOrderOf, unitOrderFor } from './path-edit';
export { unitProgress, type MoveProgress, type UnitProgress, type UnitState } from './progress';
export { GRADUATED_DAYS, UNIT_SIZE, type CourseUnit, type UnitKind, type UnitOptions, type UnitStretch } from './types';
