/* ---------------------------------------------------------------
   TEMPORARY: these point at the current Squarespace CDN so the site
   looks right today. They are the program's own photos.

   BEFORE LAUNCH: download these into src/assets/ and import them so
   Astro can optimize and self-host them. If the Squarespace account
   is ever cancelled, every one of these URLs goes dead.
   --------------------------------------------------------------- */
const CDN = 'https://images.squarespace-cdn.com/content/v1/62d45db4bbe0785e23f4ddae';

export const photos = {
  logo:      `${CDN}/0256ce6e-843a-49e8-8497-58d53217c7d2/Untitled+design.png`,
  hero:      `${CDN}/b8e9fff5-2ef0-4ee5-b50c-ade393a9fb18/2C8A8776.jpg`,
  program:   `${CDN}/1658764114512-CBWR2SZM12LVFSWDXUQ0/AHS+Orchestra-sf.jpeg`,
  orchestras:`${CDN}/1658764062897-E7P3UICUD8TGWK3C3PIB/IMG_7331_rightside.jpg`,
  director:  `${CDN}/c4dbc2ac-cfd6-486c-9744-4e38b43f5304/2C8A8737.jpg`,
} as const;
