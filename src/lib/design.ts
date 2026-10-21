import type { SiteSettings } from './content';

/* ---------------------------------------------------------------
   What Design & Appearance in the portal is allowed to change. It's a
   short, fixed list on purpose: colours and fonts swap cleanly, but
   nothing here can move or remove parts of the layout.
   --------------------------------------------------------------- */

export const DEFAULT_COLORS = {
  maroon: '#621B1D',
  maroonBright: '#982430',
  ink: '#101820',
};

/** Google Fonts families the director can pick from, and the weights loaded. */
export const FONTS: Record<string, string> = {
  Poppins: 'wght@300;400;500;600',
  Archivo: 'wght@500;600',
  'Source Sans 3': 'wght@300;400;500;600',
  Lato: 'wght@300;400;700',
  Montserrat: 'wght@400;500;600',
  'Work Sans': 'wght@300;400;500;600',
  'Libre Franklin': 'wght@300;400;500;600',
};

export const DEFAULT_FONTS = { display: 'Archivo', body: 'Poppins' };

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Resolve settings against the defaults, ignoring anything invalid. */
export function resolveDesign(s: SiteSettings = {}) {
  const pick = (v: string | undefined, d: string) => (v && HEX.test(v) ? v : d);
  const font = (v: string | undefined, d: string) => (v && v in FONTS ? v : d);
  return {
    colors: {
      maroon: pick(s.colors?.maroon, DEFAULT_COLORS.maroon),
      maroonBright: pick(s.colors?.maroonBright, DEFAULT_COLORS.maroonBright),
      ink: pick(s.colors?.ink, DEFAULT_COLORS.ink),
    },
    fontDisplay: font(s.fontDisplay, DEFAULT_FONTS.display),
    fontBody: font(s.fontBody, DEFAULT_FONTS.body),
    headerSize: s.headerSize === 'compact' ? 'compact' : 'regular',
  } as const;
}

export function fontsHref(families: string[]): string {
  const q = [...new Set(families)]
    .map((f) => `family=${f.replace(/ /g, '+')}:${FONTS[f]}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}
