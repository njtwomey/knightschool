import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ExternalLink, PageSection } from '@/components/shared/page-section';
import { to } from '@/router/location';

const REPO = 'https://github.com/njtwomey/knightschool';

/** How to suggest or add an opening (docs/v2/pages/contribute.md). The standard itself stays in the repo. */
export function ContributePage() {
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-8">
      <Breadcrumbs root={{ label: 'Add an opening', href: to('/contribute') }} />
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Add an opening</h1>
        <p className="text-sm text-muted-foreground">
          Knight School is free and open source, and its openings are plain text files, so anyone can suggest or add
          one.
        </p>
      </div>
      <PageSection title="Suggest one">
        <p>
          The easiest way to help is to say what is missing.{' '}
          <ExternalLink href={`${REPO}/issues/new`}>Open an issue on GitHub</ExternalLink> with the opening, the side
          you play it from, and why it would be useful. You need a free GitHub account.
        </p>
      </PageSection>
      <PageSection title="How openings are chosen">
        <p>Every move has to pass three tests, in this order:</p>
        <ul className="grid list-disc gap-1 pl-5">
          <li>Is it sound? A chess engine checks every move and every claim.</li>
          <li>
            Do players reach it? Lichess games from players rated about 1000 to 1600 show what really gets played.
          </li>
          <li>Does it fit one plan? A beginner should be able to follow the same idea through the opening.</li>
        </ul>
        <p>
          New openings start with their main lines, the ones most games reach, and grow later. Each note says what a
          move does and why, in plain English, and says so when a line is only level.
        </p>
      </PageSection>
      <PageSection title="Write one yourself">
        <p>
          An opening is one file saying how it is taught, and one PGN file for each line. Adding one means choosing the
          moves, writing the notes in your own words, and running the checks, which need a computer with Node and
          Stockfish.
        </p>
        <p>
          <ExternalLink href={`${REPO}/blob/main/docs/v2/making-openings.md`}>What an opening must be</ExternalLink>{' '}
          sets the standard, and the{' '}
          <ExternalLink href={`${REPO}/blob/main/.claude/skills/add-content/SKILL.md`}>step-by-step guide</ExternalLink>{' '}
          covers the rest. When it is ready, open a pull request on <ExternalLink href={REPO}>GitHub</ExternalLink>.
        </p>
      </PageSection>
    </main>
  );
}
