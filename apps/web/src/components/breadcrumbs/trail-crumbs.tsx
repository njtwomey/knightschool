import { Fragment, type ReactNode } from 'react';
import { CrumbMenu, type MenuItem } from '@/components/breadcrumbs/crumb-menu';
import { TabGroup, type TabSpec } from '@/components/breadcrumbs/tab-group';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { navigate, to } from '@/router/location';

/**
 * One crumb after the root. With `menu` (its siblings, such as every course or every line of a course) it opens that
 * menu when there is more than one; with `href` its name links back to its page; otherwise it is the page you are on.
 */
export type Crumb = {
  label: string;
  href?: string;
  menu?: { current: string; items: MenuItem[]; label: string };
};

/** The tabs at the end of the trail: one is chosen, and picking another goes to its address. */
export type CrumbTabs<T extends string> = {
  tabs: readonly TabSpec<T>[];
  value: T;
  href: (tab: T) => string;
  label: string;
  /** Changes the address in place (Profile), rather than adding to the history. */
  replace?: boolean;
};

/**
 * Where you are, the one shape every page's breadcrumbs take: a root (Courses, Create, Profile), the crumbs down to this
 * page, each a menu of its siblings where it has some, then the page's tabs, and anything else that belongs at the end
 * of the trail (`trailing`, such as previous and next).
 */
export function TrailCrumbs<T extends string>({
  root,
  crumbs = [],
  tabs,
  trailing,
}: {
  root: { label: string; href: string };
  crumbs?: Crumb[];
  tabs?: CrumbTabs<T>;
  trailing?: ReactNode;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={to(root.href)}>{root.label}</BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, i) => (
          <Fragment key={i}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <CrumbItem crumb={crumb} />
            </BreadcrumbItem>
          </Fragment>
        ))}
        {tabs && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <TabGroup
                tabs={tabs.tabs}
                value={tabs.value}
                onPick={(next) => navigate(tabs.href(next), tabs.replace ? { replace: true } : undefined)}
                label={tabs.label}
              />
            </BreadcrumbItem>
          </>
        )}
        {trailing && <BreadcrumbItem>{trailing}</BreadcrumbItem>}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function CrumbItem({ crumb }: { crumb: Crumb }) {
  const { label, href, menu } = crumb;
  if (menu && menu.items.length > 1)
    return <CrumbMenu label={label} href={href} current={menu.current} items={menu.items} menuLabel={menu.label} />;
  return href ? <BreadcrumbLink href={to(href)}>{label}</BreadcrumbLink> : <BreadcrumbPage>{label}</BreadcrumbPage>;
}
