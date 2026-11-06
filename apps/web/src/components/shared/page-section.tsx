import type { ReactNode } from 'react';

/** A link in a page's text to another site. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
      {children}
    </a>
  );
}

/** A titled section of a page of text, such as the credits. */
export function PageSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
