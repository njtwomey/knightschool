import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PageError, PageErrorBoundary } from './error-boundary';

describe('PageErrorBoundary', () => {
  const boundary = (resetKey: string) => new PageErrorBoundary({ children: 'the page', resetKey });

  it('shows the page until something in it throws, then the error in its place', () => {
    const page = boundary('/quiz');
    expect(page.render()).toBe('the page');
    page.state = { ...page.state, ...PageErrorBoundary.getDerivedStateFromError(new Error('No position x in t')) };
    const shown = renderToStaticMarkup(page.render() as ReturnType<typeof createElement>);
    expect(shown).toContain('Something went wrong on this page');
    expect(shown).toContain('No position x in t');
    expect(shown).toContain('Reload');
  });

  it('starts afresh on another address, and keeps the error on the same one', () => {
    const failed = { error: new Error('boom'), resetKey: '/quiz' };
    expect(PageErrorBoundary.getDerivedStateFromProps({ children: null, resetKey: '/quiz' }, failed)).toBeNull();
    expect(PageErrorBoundary.getDerivedStateFromProps({ children: null, resetKey: '/stats' }, failed)).toEqual({
      error: null,
      resetKey: '/stats',
    });
  });

  it('turns anything thrown into an error with a message', () => {
    expect(PageErrorBoundary.getDerivedStateFromError('plain text').error?.message).toBe('plain text');
    expect(renderToStaticMarkup(createElement(PageError, { message: 'x' }))).toContain('<p>x</p>');
  });
});
