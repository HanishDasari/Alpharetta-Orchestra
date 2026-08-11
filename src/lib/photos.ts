/* ---------------------------------------------------------------
   TEMPORARY: these point at the current Squarespace CDN so the demo
   looks like the real site today. They are the program's own photos.

   BEFORE LAUNCH: download these into src/assets/ and import them so
   Astro can optimize and self-host them. If the Squarespace account
   is ever cancelled, every one of these URLs goes dead.

   Names match where each photo sits on the current homepage.
   --------------------------------------------------------------- */
const CDN = 'https://images.squarespace-cdn.com/content/v1/62d45db4bbe0785e23f4ddae';

/* The logo is no longer here — it now lives at src/assets/logo.png and is
   imported directly by Header.astro. These five still need the same
   treatment. */
export const photos = {
  /** Section 1 — full-bleed hero photo */
  hero: `${CDN}/04db763f-4598-4ea9-b7bc-4c96c3392a85/2C8A9407.jpg`,
  /** Section 2 — photo beside the intro copy */
  intro: `${CDN}/b8e9fff5-2ef0-4ee5-b50c-ade393a9fb18/2C8A8776.jpg`,
  /** Section 3 — the three alternating rows */
  program: `${CDN}/1658764114512-CBWR2SZM12LVFSWDXUQ0/AHS+Orchestra-sf.jpeg`,
  orchestras: `${CDN}/1658764062897-E7P3UICUD8TGWK3C3PIB/IMG_7331_rightside.jpg`,
  director: `${CDN}/c4dbc2ac-cfd6-486c-9744-4e38b43f5304/2C8A8737.jpg`,
} as const;
