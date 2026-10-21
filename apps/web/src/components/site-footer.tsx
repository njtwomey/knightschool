import { to } from '@/router/location';
const LINKS = [
  { href: to('/courses'), label: 'Courses' },
  { href: to('/search'), label: 'Search' },
  { href: to('/quiz'), label: 'Quiz' },
  { href: to('/profile/stats'), label: 'Stats' },
  { href: to('/profile/settings'), label: 'Settings' },
  { href: to('/lab'), label: 'Board lab' },
  { href: to('/credits'), label: 'Credits and licences' },
];

/**
 * Kept small, and always below the first screen: the page area is at least a full viewport tall, so the footer is only
 * seen by scrolling to it.
 */
export function SiteFooter() {
  return (
    <footer className="border-t text-xs text-muted-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4">
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
