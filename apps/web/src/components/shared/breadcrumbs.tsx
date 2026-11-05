import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Fragment, useCallback, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TrailSlot } from './trail-slot';
import { cn } from '@/lib/utils';
import { Hint } from './hint';
import { IconAction } from './icon-action';

/** A sibling in a crumb's menu: another variation of the opening, another step of the variation. */
export type CrumbSibling = {
  id: string;
  label: string;
  href: string;
  /** Drawn after the name: a state badge. */
  badge?: ReactNode;
  /** What opens it, when it is locked: its hover text; the item is not a link unless `opens`. */
  locked?: string;
  /** A locked item that still opens (gates that only suggest, or after asking): drawn locked, and chosen as usual. */
  opens?: boolean;
  /** Chosen instead of following `href`: a locked step asks once before it opens (step-row.md). */
  onSelect?: () => void;
  /** Drawn in a little, under the item before it: a step's follow-ups under the step. */
  indent?: boolean;
  /** A heading the item sits under, for long menus. */
  group?: string;
};

export type Crumb = {
  label: string;
  /** Where its name goes; none for the page you are on. */
  href?: string;
  siblings?: { current: string; items: CrumbSibling[]; label: string };
};

export type CrumbTab = { value: string; label: string; href: string; hint?: string };

export type BreadcrumbsProps = {
  /** The menu item the page belongs to (Learn, Practice, Explore, Ideas, Create, You). */
  root: { label: string; href: string };
  /** Down to this page; the last one without `href` is the current page. */
  crumbs?: Crumb[];
  tabs?: { items: CrumbTab[]; value: string; label: string };
  previous?: { label: string; href: string };
  next?: { label: string; href: string };
  /** Anything else that belongs at the end. */
  trailing?: ReactNode;
  className?: string;
};

function SiblingMenu({
  crumb,
  trigger,
}: {
  crumb: Crumb & { siblings: NonNullable<Crumb['siblings']> };
  trigger: ReactNode;
}) {
  // Scrolled after the menu is placed, so the current item sits in the middle of a long list.
  const scrollHere = useCallback((element: HTMLElement | null) => {
    if (element) requestAnimationFrame(() => element.scrollIntoView({ block: 'center' }));
  }, []);
  const { items, current, label } = crumb.siblings;
  const groups = [...new Set(items.map((item) => item.group ?? ''))];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 w-80 overflow-y-auto" aria-label={label}>
        {groups.map((group) => (
          <Fragment key={group}>
            {group ? <DropdownMenuLabel>{group}</DropdownMenuLabel> : null}
            {items
              .filter((item) => (item.group ?? '') === group)
              .map((item) => {
                const here = item.id === current;
                // One line per item: the name and its state mark. What opens a locked item is its hover text,
                // not a sentence in the menu.
                const body = (
                  <>
                    <Check aria-hidden className={here ? '' : 'invisible'} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ?? (item.locked ? <Lock aria-hidden /> : null)}
                  </>
                );
                const className = cn(item.indent && 'pl-6', here && 'bg-accent font-medium');
                if (item.locked && !item.opens) {
                  return (
                    <DropdownMenuItem key={item.id} disabled className={className} title={item.locked}>
                      {body}
                    </DropdownMenuItem>
                  );
                }
                if (item.onSelect) {
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      ref={here ? scrollHere : undefined}
                      className={className}
                      title={item.locked}
                      onSelect={item.onSelect}
                    >
                      {body}
                    </DropdownMenuItem>
                  );
                }
                return (
                  <DropdownMenuItem key={item.id} asChild ref={here ? scrollHere : undefined} className={className}>
                    <a href={item.href} aria-current={here ? 'page' : undefined}>
                      {body}
                    </a>
                  </DropdownMenuItem>
                );
              })}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CrumbItem({ crumb }: { crumb: Crumb }) {
  const { label, href, siblings } = crumb;
  if (siblings && siblings.items.length > 1) {
    const withSiblings = crumb as Crumb & { siblings: NonNullable<Crumb['siblings']> };
    // A click anywhere on a crumb with a menu opens the menu; the crumb's own page is its ticked item there.
    return (
      <SiblingMenu
        crumb={withSiblings}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className={cn('-ml-2 h-7 gap-1 px-2 font-normal', href && 'text-muted-foreground hover:text-foreground')}
            aria-label={`${label}: ${siblings.label}`}
          >
            {href ? label : <BreadcrumbPage>{label}</BreadcrumbPage>}
            <ChevronDown aria-hidden />
          </Button>
        }
      />
    );
  }
  return href ? <BreadcrumbLink href={href}>{label}</BreadcrumbLink> : <BreadcrumbPage>{label}</BreadcrumbPage>;
}

function Tabs({ tabs, className }: { tabs: NonNullable<BreadcrumbsProps['tabs']>; className?: string }) {
  return (
    <ButtonGroup aria-label={tabs.label} className={className}>
      {tabs.items.map((tab) => {
        const chosen = tab.value === tabs.value;
        const link = (
          <Button
            key={tab.value}
            asChild
            variant="outline"
            size="sm"
            className={cn(
              'flex-1 px-3',
              chosen &&
                'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:bg-primary dark:hover:bg-primary/90',
            )}
          >
            <a href={tab.href} aria-current={chosen ? 'page' : undefined}>
              {tab.label}
            </a>
          </Button>
        );
        return tab.hint ? (
          <Hint key={tab.value} text={tab.hint} delay="long">
            {link}
          </Hint>
        ) : (
          link
        );
      })}
    </ButtonGroup>
  );
}

function Neighbours({ previous, next }: Pick<BreadcrumbsProps, 'previous' | 'next'>) {
  if (!previous && !next) return null;
  return (
    <span className="inline-flex items-center">
      {previous ? (
        <IconAction label={`Previous: ${previous.label}`} href={previous.href}>
          <ChevronLeft aria-hidden />
        </IconAction>
      ) : null}
      {next ? (
        <IconAction label={`Next: ${next.label}`} href={next.href}>
          <ChevronRight aria-hidden />
        </IconAction>
      ) : null}
    </span>
  );
}

/**
 * The trail at the top of a page: the root, the crumbs down to this page (each a menu of its siblings), the page's
 * tabs, and previous and next. One shape on every page; every crumb and tab is a real link. In a narrow column it shrinks to
 * the last crumb with a back arrow whose menu lists the crumbs above, and the tabs drop below
 * (docs/v2/components/breadcrumbs.md). During a test the page passes crumbs that do not name the answer.
 */
export function Breadcrumbs({ root, crumbs = [], tabs, previous, next, trailing, className }: BreadcrumbsProps) {
  const last = crumbs[crumbs.length - 1];
  const above = [root, ...crumbs.slice(0, -1)].filter(
    (crumb): crumb is { label: string; href: string } => !!crumb.href,
  );
  const slot = useContext(TrailSlot);
  const trail = (
    <div className={cn('@container grid gap-2', slot && 'mx-auto w-full max-w-7xl px-4 py-2', className)}>
      {/* Wide screens: the whole trail on one line. */}
      <Breadcrumb className="hidden @xl:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={root.href}>{root.label}</BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb, i) => (
            <Fragment key={`${crumb.label}-${i}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <CrumbItem crumb={crumb} />
              </BreadcrumbItem>
            </Fragment>
          ))}
          {tabs ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <Tabs tabs={tabs} />
              </BreadcrumbItem>
            </>
          ) : null}
          {previous || next ? (
            <BreadcrumbItem>
              <Neighbours previous={previous} next={next} />
            </BreadcrumbItem>
          ) : null}
          {trailing ? <BreadcrumbItem>{trailing}</BreadcrumbItem> : null}
        </BreadcrumbList>
      </Breadcrumb>

      {/* A phone: back to the crumbs above, the last crumb, then the tabs full width. */}
      <nav aria-label="Breadcrumb" className="grid gap-2 @xl:hidden">
        <div className="flex min-w-0 items-center gap-1 text-sm">
          {above.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Back up the trail">
                  <ArrowLeft aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {above.map((crumb) => (
                  <DropdownMenuItem key={crumb.href} asChild>
                    <a href={crumb.href}>{crumb.label}</a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <span className="min-w-0 truncate">
            {last ? <CrumbItem crumb={last} /> : <BreadcrumbLink href={root.href}>{root.label}</BreadcrumbLink>}
          </span>
          <span className="ml-auto flex items-center">
            <Neighbours previous={previous} next={next} />
            {trailing}
          </span>
        </div>
        {tabs ? <Tabs tabs={tabs} className="w-full" /> : null}
      </nav>
    </div>
  );
  // Floats in the bar under the header when the app has one, so it stays on top as the page scrolls.
  return slot ? createPortal(trail, slot) : trail;
}
