import { overridesToYaml } from '@knightschool/core';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCourseUnits, useDraft } from './helpers';
import { useAuthor, type DraftCourse } from './store';

/**
 * The course's path as the app cuts it, and changes to it: the same `units:` block as a shipped course.yaml, written as
 * YAML and checked against the units before it is saved.
 */
export function PathOverrides({ course }: { course: DraftCourse }) {
  const units = useCourseUnits(course.id);
  const [text, setText] = useDraft(overridesToYaml(course.manifest.units));
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
        <Label htmlFor="units-yaml">Changes to the path</Label>
        <p className="text-sm text-muted-foreground">
          <code>order</code> puts units first, as early as what they wait for allows; <code>after</code> makes a unit
          wait for others; <code>drop</code> removes what it waits for. Leave it empty to keep the path as cut.
        </p>
        <Textarea
          id="units-yaml"
          className="font-mono"
          rows={10}
          value={text}
          placeholder={'order: [my-line:2]\nafter:\n  my-line-2:1: [my-line:1]'}
          onChange={(event) => setText(event.target.value)}
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button
          className="justify-self-start"
          onClick={() => void useAuthor.getState().setOverrides(text).then(setError)}
        >
          Save the path changes
        </Button>
      </div>
      <div className="grid content-start gap-2">
        <h3 className="text-sm font-semibold">The units, as cut now</h3>
        {units.length === 0 ? (
          <p className="text-sm text-muted-foreground">No units yet: play some moves of yours first.</p>
        ) : (
          <ol className="grid gap-1 text-sm">
            {units.map((unit) => (
              <li key={unit.id} className="flex gap-2">
                <span className="w-6 text-right tabular-nums text-muted-foreground">{unit.index + 1}</span>
                <code>{unit.id}</code>
                <span className="text-muted-foreground">
                  {unit.cards.length} {unit.cards.length === 1 ? 'move' : 'moves'}
                  {unit.prerequisites.length > 0 && `, after ${unit.prerequisites.join(', ')}`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
