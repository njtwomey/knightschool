import { to } from '@/router/location';

const LINKS = [
  { href: to('/board'), label: 'Board' },
  { href: to('/mocks'), label: 'Mocks' },
  { href: to('/contribute'), label: 'Add an opening' },
  { href: to('/credits'), label: 'Credits and licences' },
  { href: 'https://github.com/njtwomey/knightschool', label: 'Source' },
];

/** Small, and always below the first screen: the page above it is at least as tall as the window. */
export function SiteFooter() {
  return (
    <footer className="border-t text-xs text-muted-foreground">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4">
        <p>© 2026 Niall Twomey. MIT licence. Your progress stays on this device.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
          {LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
