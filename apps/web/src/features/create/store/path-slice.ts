import {
  checkUnitOverrides,
  type CourseEntry,
  CourseManifest,
  courseUnits,
  fittingPlacements,
  projectCourse,
  unitOrderFor,
  type UnitOverrides,
} from '@knightschool/core';
import { errorText } from '@/lib/errors';
import { entryId, entrySection, withSection, type DraftCourse } from '../draft';
import type { SliceContext } from './context';
import type { AuthorState } from './types';

type PathSlice = Pick<AuthorState, 'setPath' | 'placeExtra'>;

/** The study path: the order of the lines (course.yaml `lines:` and `units.order`) and where extras are shown. */
export function pathSlice({ get, save, courseOf, courseChange, titleOf }: SliceContext): PathSlice {
  return {
    async setPath(path, bonus) {
      const course = courseOf(get().courseId);
      const tree = get().build?.tree;
      if (!course || !tree) return 'No course is open.';
      const byId = new Map(course.manifest.lines.map((entry) => [entryId(entry), entry]));
      const content = get().build?.courses.find((candidate) => candidate.opening.id === course.id);
      // A trap we spring is a bonus by its kind already; anything else in the bonus is an alternative.
      const springs = (id: string) => {
        const variant = content?.opening.variants.find((candidate) => candidate.id === id);
        return (variant ? variant.whose : tree.lines.get(id)?.game.tags.Kind) === 'for-us';
      };
      const entry = (id: string, alternative: boolean): CourseEntry => {
        const old = byId.get(id) ?? id;
        const next: Record<string, unknown> = typeof old === 'string' ? { id: old } : { ...old };
        delete next.alternative;
        if (alternative && !springs(id)) next.alternative = true;
        return withSection(next as CourseEntry, entrySection(old));
      };
      const lines = [...path.map((id) => entry(id, false)), ...bonus.map((id) => entry(id, true))];
      // Projected without overrides first: an order that gives one position two answers fails here, as in the build.
      const manifest: DraftCourse['manifest'] = { ...course.manifest, lines };
      delete manifest.units;
      let projected;
      try {
        projected = projectCourse(course.id, CourseManifest.parse(manifest), tree);
      } catch (error) {
        return errorText(error);
      }
      const custom = course.manifest.units;
      const kept = { after: custom?.after ?? {}, drop: custom?.drop ?? {} };
      const order = unitOrderFor(projected, path, kept);
      // Placements of traps and quizzes stay where they still fit the new order.
      const ordered = { ...projected, opening: { ...projected.opening, units: { order: order ?? [], ...kept } } };
      const place = fittingPlacements(ordered, custom?.place ?? {});
      if (order || Object.keys(kept.after).length || Object.keys(kept.drop).length || Object.keys(place).length) {
        manifest.units = { order: order ?? [], ...kept, ...(Object.keys(place).length ? { place } : {}) };
        try {
          checkUnitOverrides({ ...projected, opening: { ...projected.opening, units: manifest.units } });
        } catch (error) {
          return errorText(error);
        }
      }
      // Name the change: a line moved to or from the bonus, else a new order.
      const wasBonus = (id: string) => {
        const old = byId.get(id);
        return springs(id) || (typeof old !== 'string' && Boolean(old?.alternative));
      };
      const toBonus = bonus.find((id) => !wasBonus(id));
      const toPath = path.find((id) => wasBonus(id));
      const label = toBonus
        ? `move ${titleOf(toBonus)} to bonus`
        : toPath
          ? `move ${titleOf(toPath)} to the path`
          : 'reorder the path';
      const saved = await save([courseChange({ ...course, manifest })], 'Saved the order of the path.', false, label);
      return saved ? null : (get().message?.text ?? 'The order was not saved.');
    },

    async placeExtra(item, unitId) {
      const course = courseOf(get().courseId);
      const content = get().build?.courses.find((candidate) => candidate.opening.id === course?.id);
      if (!course || !content) return 'No course is open.';
      const units: UnitOverrides = { order: [], after: {}, drop: {}, ...course.manifest.units };
      const place = { ...units.place };
      // Only a placement that differs from where it would be anyway is written.
      const natural = courseUnits({
        ...content,
        opening: {
          ...content.opening,
          units: { ...units, place: Object.fromEntries(Object.entries(place).filter(([key]) => key !== item)) },
        },
      }).find((unit) => unit.traps.includes(item) || unit.quizzes.includes(item))?.id;
      if (unitId && unitId !== natural) place[item] = unitId;
      else delete place[item];
      const next: UnitOverrides = { ...units, place };
      if (Object.keys(place).length === 0) delete next.place;
      try {
        checkUnitOverrides({ ...content, opening: { ...content.opening, units: next } });
      } catch (error) {
        return errorText(error);
      }
      const manifest = { ...course.manifest };
      const empty =
        !next.order.length && !Object.keys(next.after).length && !Object.keys(next.drop).length && !next.place;
      if (empty) delete manifest.units;
      else manifest.units = next;
      const quiz = content.quizzes.find((candidate) => candidate.id === item);
      const name = quiz ? `the question ${item}` : titleOf(item);
      const unit = courseUnits({ ...content, opening: { ...content.opening, units: next } }).find(
        (candidate) => candidate.traps.includes(item) || candidate.quizzes.includes(item),
      );
      const saved = await save(
        [courseChange({ ...course, manifest })],
        'Saved where it is shown.',
        false,
        unit ? `show ${name} with ${titleOf(unit.line)} ${unit.n}` : `move ${name}`,
      );
      return saved ? null : (get().message?.text ?? 'It was not saved.');
    },
  };
}
