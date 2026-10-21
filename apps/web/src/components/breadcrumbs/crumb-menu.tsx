import { Check, ChevronDown } from 'lucide-react';
import { Fragment, useCallback } from 'react';
import { BreadcrumbLink, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { to } from '@/router/location';

export type MenuItem = { id: string; label: string; href: string; group: string };

/**
 * A breadcrumb that is also a menu of its siblings (every course, or every line of a course), to move sideways without
 * going back. The current one is ticked and the menu opens scrolled to it. When the crumb is a page you can go back to
 * (`href`), its name stays a link and a chevron beside it opens the menu; when it is the page you are on, the whole
 * crumb opens the menu.
 */
export function CrumbMenu({
  label,
  href,
  current,
  items,
  menuLabel,
}: {
  label: string;
  href?: string;
  current: string;
  items: MenuItem[];
  menuLabel: string;
}) {
  // Scrolled after the menu has been placed, so the current item sits in the middle of a long list.
  const scrollHere = useCallback((element: HTMLElement | null) => {
    if (element) requestAnimationFrame(() => element.scrollIntoView({ block: 'center' }));
  }, []);
  const groups = [...new Set(items.map((item) => item.group))];
  const trigger = href ? (
    <Button variant="ghost" size="icon" className="-ml-1 size-6" aria-label={menuLabel}>
      <ChevronDown aria-hidden />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-7 gap-1 px-2 font-normal text-foreground"
      aria-label={menuLabel}
    >
      <BreadcrumbPage>{label}</BreadcrumbPage>
      <ChevronDown aria-hidden />
    </Button>
  );
  return (
    <span className="inline-flex items-center gap-0.5">
      {href && <BreadcrumbLink href={to(href)}>{label}</BreadcrumbLink>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-96 w-80 overflow-y-auto">
          {groups.map((group) => (
            <Fragment key={group}>
              <DropdownMenuLabel>{group}</DropdownMenuLabel>
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const here = item.id === current;
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      asChild
                      ref={here ? scrollHere : undefined}
                      className={here ? 'bg-accent font-medium' : undefined}
                    >
                      <a href={to(item.href)} aria-current={here ? 'page' : undefined}>
                        <Check aria-hidden className={here ? '' : 'invisible'} />
                        {item.label}
                      </a>
                    </DropdownMenuItem>
                  );
                })}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
