import type { OpeningContent } from '@knightschool/core';
import { Button } from '@/components/ui/button';
import type { CoursePath } from '@/data/course-path';
import { to } from '@/router/location';
import { SESSION_TYPES } from './sessions';

/** The ways to study the course from where you are on its path: one card per session type, each with what it would do. */
export function SessionStarters({ content, path }: { content: OpeningContent; path: CoursePath }) {
  return (
    <section aria-label="Study from the path" className="grid gap-2 sm:grid-cols-3">
      {SESSION_TYPES.map((type) => {
        const pick = type.pick({ content, path });
        const Icon = type.icon;
        return (
          <div key={type.id} className="grid content-between gap-2 rounded-xl border bg-card p-3">
            <div className="grid gap-1">
              <h3 className="flex items-center gap-2 font-semibold leading-tight">
                <Icon className="size-4" aria-hidden /> {type.name}
              </h3>
              <p className="text-sm text-muted-foreground">{type.blurb}</p>
              <p className="text-sm">{pick.ready ? pick.summary : pick.reason}</p>
            </div>
            {pick.ready ? (
              <Button asChild size="sm" className="justify-self-start">
                <a href={to(pick.href)} onClick={() => pick.prepare?.()}>
                  Start
                </a>
              </Button>
            ) : (
              <Button size="sm" className="justify-self-start" disabled>
                Start
              </Button>
            )}
          </div>
        );
      })}
    </section>
  );
}
