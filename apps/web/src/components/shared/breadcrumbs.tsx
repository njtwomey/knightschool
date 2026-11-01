import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Fragment, useCallback, type ReactNode } from 'react';
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
  /** What opens it, when it is locked: shown, and the item is not a link. */
  locked?: string;
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
                if (item.locked) {
                  return (
                    <DropdownMenuItem key={item.id} disabled className="items-start">
                      <Lock aria-hidden className="mt-0.5" />
                      <span className="grid">
                        <span>{item.label}</span>
                        <span className="text-xs">{item.locked}</span>
                      </span>
                    </DropdownMenuItem>
                  );
                }
                return (
                  <DropdownMenuItem
                    key={item.id}
                    asChild
                    ref={here ? scrollHere : undefined}
                    className={here ? 'bg-accent font-medium' : undefined}
                  >
                    <a href={item.href} aria-current={here ? 'page' : undefined}>
                      <Check aria-hidden className={here ? '' : 'invisible'} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge}
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
    // A crumb you can go back to keeps its name as a link and opens the menu from the chevron; the current page
    // opens the menu from the whole crumb.
    if (href) {
      return (
        <span className="inline-flex items-center gap-0.5">
          <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
          <SiblingMenu
            crumb={withSiblings}
            trigger={
              <Button variant="ghost" size="icon-xs" aria-label={siblings.label}>
                <ChevronDown aria-hidden />
              </Button>
            }
          />
        </span>
      );
    }
    return (
      <SiblingMenu
        crumb={withSiblings}
        trigger={
          <Button variant="ghost" size="sm" className="-ml-2 h-7 gap-1 px-2 font-normal" aria-label={siblings.label}>
            <BreadcrumbPage>{label}</BreadcrumbPage>
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
  return (
    <div className={cn('@container grid gap-2', className)}>
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
}
