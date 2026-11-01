import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { to } from '@/router/location';

export function HomePage() {
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-16">
      <img src={to('/icon.svg')} alt="" className="size-16" />
      <h1 className="text-3xl font-semibold tracking-tight">Knight School</h1>
      <p className="text-lg text-muted-foreground">
        Learn what to play in the first moves, why, and what to do when your opponent goes wrong.
      </p>
      <p className="text-muted-foreground">
        This is the new version, being built from its plan. The pieces are on show in the mocks gallery first.
      </p>
      <div>
        <Button asChild size="lg">
          <a href={to('/mocks')}>
            See the mocks <ArrowRight aria-hidden />
          </a>
        </Button>
      </div>
    </main>
  );
}
