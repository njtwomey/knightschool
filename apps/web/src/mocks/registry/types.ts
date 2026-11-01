import type { ReactNode } from 'react';

export type MockVariant = {
  name: string;
  /** One line on what this variant shows, or where it is used. */
  note?: string;
  render: () => ReactNode;
};

/** A built component in the gallery; `id` is its spec's file name in docs/v2/components (without .md). */
export type MockItem = { id: string; variants: MockVariant[] };
