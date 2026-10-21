/** What went wrong, in words to show: an Error's message, or the thrown value as text. */
export const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
