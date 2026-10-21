import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** `resetKey` is the address: moving to another page clears the error and shows that page. */
type Props = { children: ReactNode; resetKey: string };
type State = { error: Error | null; resetKey: string };

/**
 * Catches an error thrown while a page renders, so one page cannot blank the whole app: the header and menu stay, and
 * the page says what went wrong with a way to reload.
 */
export class PageErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return <PageError message={this.state.error.message} />;
  }
}

/** What a page that failed shows instead. */
export function PageError({ message }: { message: string }) {
  return (
    <Page>
      <Alert variant="destructive">
        <AlertTitle>Something went wrong on this page</AlertTitle>
        <AlertDescription className="grid gap-2">
          <p>{message}</p>
          <Button size="sm" className="w-fit" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </AlertDescription>
      </Alert>
    </Page>
  );
}
