export const DEFAULT_THEME_ID = 'green';

function diamondPoints(cx, cy, radius) {
  return `${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}`;
}

function renderDiamond(cx, cy, radius, options = {}) {
  const fill = options.fill || 'none';
  const stroke = options.stroke || 'none';
  const strokeWidth = options.strokeWidth || 0;
  const opacity = options.opacity == null ? 1 : options.opacity;
  return `<polygon points="${diamondPoints(cx, cy, radius)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" opacity="${opacity}"/>`;
}

function createEdiyatPatternDataUri(colors) {
  const tileSize = 72;
  const latticeCenters = [
    [0, 18], [36, 18], [72, 18],
    [18, 36], [54, 36],
    [0, 54], [36, 54], [72, 54],
    [18, 0], [54, 0],
    [18, 72], [54, 72]
  ];
  const accentCenters = [
    [18, 18], [54, 18],
    [0, 36], [36, 36], [72, 36],
    [18, 54], [54, 54]
  ];

  const softOutlines = latticeCenters.map(([cx, cy]) => renderDiamond(cx, cy, 19, {
    stroke: colors.lineSoft,
    strokeWidth: 5.4,
    opacity: 0.9
  })).join('');

  const outerDiamonds = latticeCenters.map(([cx, cy]) => renderDiamond(cx, cy, 16, {
    fill: colors.diamondOuter,
    stroke: colors.lineDark,
    strokeWidth: 2.2
  })).join('');

  const middleDiamonds = latticeCenters.map(([cx, cy]) => renderDiamond(cx, cy, 10.5, {
    fill: colors.diamondMiddle,
    stroke: colors.cardinal,
    strokeWidth: 1.8
  })).join('');

  const innerDiamonds = latticeCenters.map(([cx, cy]) => renderDiamond(cx, cy, 6, {
    fill: colors.diamondInner,
    stroke: colors.lineDark,
    strokeWidth: 1.4
  })).join('');

  const whiteHighlights = latticeCenters.map(([cx, cy]) => renderDiamond(cx, cy, 3.2, {
    fill: colors.lineWhite,
    stroke: colors.micro,
    strokeWidth: 0.8
  })).join('');

  const accentDiamonds = accentCenters.map(([cx, cy]) => renderDiamond(cx, cy, 3.8, {
    fill: colors.micro,
    stroke: colors.lineDark,
    strokeWidth: 0.9
  })).join('');

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}">
    <rect width="${tileSize}" height="${tileSize}" fill="${colors.tileBg}"/>
    ${softOutlines}
    ${outerDiamonds}
    ${middleDiamonds}
    ${innerDiamonds}
    ${whiteHighlights}
    ${accentDiamonds}
  </svg>`;

  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

export const THEME_OPTIONS = [
  {
    id: 'red',
    label: 'Red',
    description: 'Bright red',
    frame: {
      fill: '#f6cf7a',
      inner: '#f1ece9',
      border: '#4c1918',
      shadow: 'rgba(122, 32, 27, 0.2)',
      tileBg: '#f6cf7a',
      lineDark: '#3a0f0f',
      lineSoft: '#ffe6bd',
      lineWhite: '#fff7e2',
      diamondOuter: '#a3171c',
      diamondMiddle: '#ff5b3d',
      diamondInner: '#ffd25b',
      cardinal: '#ffe39b',
      micro: '#6d1a1d'
    }
  },
  {
    id: 'purple',
    label: 'Purple',
    description: 'Playful purple',
    frame: {
      fill: '#dcc4f5',
      inner: '#f0edf5',
      border: '#36244f',
      shadow: 'rgba(80, 54, 122, 0.2)',
      tileBg: '#dcc4f5',
      lineDark: '#382550',
      lineSoft: '#f4e2ff',
      lineWhite: '#fff7ff',
      diamondOuter: '#6b56c7',
      diamondMiddle: '#f4b7d3',
      diamondInner: '#ffe68c',
      cardinal: '#ffe59f',
      micro: '#5c4298'
    }
  },
  {
    id: 'gray',
    label: 'Gray',
    description: 'Calm stone',
    frame: {
      fill: '#d6d9dc',
      inner: '#ececec',
      border: '#2f353a',
      shadow: 'rgba(64, 72, 78, 0.18)',
      tileBg: '#d6d9dc',
      lineDark: '#2f353a',
      lineSoft: '#eef1f3',
      lineWhite: '#ffffff',
      diamondOuter: '#7a868f',
      diamondMiddle: '#f2f5f6',
      diamondInner: '#c3cbd1',
      cardinal: '#f9fbfc',
      micro: '#59636b'
    }
  },
  {
    id: 'blue',
    label: 'Blue',
    description: 'Sky blue',
    frame: {
      fill: '#ffe29b',
      inner: '#eef3f7',
      border: '#204988',
      shadow: 'rgba(42, 93, 171, 0.2)',
      tileBg: '#ffe29b',
      lineDark: '#1c355e',
      lineSoft: '#fff2c6',
      lineWhite: '#fff9e4',
      diamondOuter: '#2c7adc',
      diamondMiddle: '#ff9d47',
      diamondInner: '#8fd0f3',
      cardinal: '#ffe46d',
      micro: '#2a62b0'
    }
  },
  {
    id: 'orange',
    label: 'Orange',
    description: 'Sunny orange',
    frame: {
      fill: '#ffd15e',
      inner: '#f4ede7',
      border: '#5d2f53',
      shadow: 'rgba(155, 92, 24, 0.2)',
      tileBg: '#ffd15e',
      lineDark: '#5d2f53',
      lineSoft: '#ffe7a5',
      lineWhite: '#fff4cf',
      diamondOuter: '#ffae31',
      diamondMiddle: '#ffe05d',
      diamondInner: '#f2b95a',
      cardinal: '#cfd7c8',
      micro: '#7b3b68'
    }
  },
  {
    id: 'green',
    label: 'Green',
    description: 'Fresh green',
    frame: {
      fill: '#d8ee77',
      inner: '#eef5ea',
      border: '#2b6a32',
      shadow: 'rgba(47, 113, 54, 0.2)',
      tileBg: '#d8ee77',
      lineDark: '#285b2e',
      lineSoft: '#edf7b2',
      lineWhite: '#fbffe5',
      diamondOuter: '#2f9f4b',
      diamondMiddle: '#ffe66d',
      diamondInner: '#96d9a2',
      cardinal: '#fff0c8',
      micro: '#4f8c55'
    }
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

export function getThemeFrameVars(value) {
  const theme = getThemeOption(value);
  return {
    '--frame-fill': theme.frame.fill,
    '--frame-inner': theme.frame.inner,
    '--frame-border': theme.frame.border,
    '--frame-pattern': createEdiyatPatternDataUri(theme.frame),
    '--frame-shadow-color': theme.frame.shadow
  };
}