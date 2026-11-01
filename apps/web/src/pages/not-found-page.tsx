import { Button } from '@/components/ui/button';
import { to } from '@/router/location';

export function NotFoundPage() {
  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Nothing here</h1>
      <p className="text-muted-foreground">This address does not lead to a page.</p>
      <div>
        <Button asChild variant="outline">
          <a href={to('/')}>Go home</a>
        </Button>
      </div>
    </main>
  );
}
