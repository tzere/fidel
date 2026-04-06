export const DEFAULT_THEME_ID = 'classic';

export const THEME_OPTIONS = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Soft sand'
  },
  {
    id: 'red',
    label: 'Red',
    description: 'Bright red'
  },
  {
    id: 'purple',
    label: 'Purple',
    description: 'Playful purple'
  },
  {
    id: 'gray',
    label: 'Gray',
    description: 'Calm stone'
  },
  {
    id: 'blue',
    label: 'Blue',
    description: 'Sky blue'
  },
  {
    id: 'orange',
    label: 'Orange',
    description: 'Sunny orange'
  },
  {
    id: 'green',
    label: 'Green',
    description: 'Fresh green'
  }
];

const THEME_LOOKUP = Object.fromEntries(THEME_OPTIONS.map((theme) => [theme.id, theme]));

export function normalizeThemeId(value) {
  const themeId = String(value || '').trim().toLowerCase();
  return THEME_LOOKUP[themeId] ? themeId : DEFAULT_THEME_ID;
}

export function getThemeOption(value) {
  return THEME_LOOKUP[normalizeThemeId(value)];
}