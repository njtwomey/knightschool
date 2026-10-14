/** Board colours. The first two follow the profiles asked for: a soft green and a warm tan. */
export const BOARD_THEMES = [
  { id: 'green', name: 'Green', light: '#ebecd0', dark: '#7a9459' },
  { id: 'tan', name: 'Tan', light: '#e8dbbc', dark: '#c1a07a' },
  { id: 'blue', name: 'Blue', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'slate', name: 'Slate', light: '#d9dde3', dark: '#7b8794' },
  { id: 'purple', name: 'Purple', light: '#e9e3f1', dark: '#9884bd' },
] as const;

export type BoardThemeId = (typeof BOARD_THEMES)[number]['id'];

export const themeById = (id: string) => BOARD_THEMES.find((theme) => theme.id === id) ?? BOARD_THEMES[0];
