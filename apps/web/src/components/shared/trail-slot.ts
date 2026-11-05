import { createContext } from 'react';

/**
 * Where a page's breadcrumbs float: a bar under the header that stays on top as the page scrolls, so the trail and an
 * opening's tabs are always in reach. The app provides it; a page that lays its own trail out (FullPage, the mocks)
 * provides `null`, and the breadcrumbs draw where they are.
 */
export const TrailSlot = createContext<HTMLElement | null>(null);
