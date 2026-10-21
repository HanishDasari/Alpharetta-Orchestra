/* ---------------------------------------------------------------
   Every off-site link and contact detail in one place, so a change
   (new email, store moves, handbook updated) is a one-line edit.
   --------------------------------------------------------------- */

export const contact = {
  director: { name: 'Jake Hood', title: 'Director of Orchestras', email: 'hoodj3@fultonschools.org' },
  treasurer: { email: 'treasurerahsorchestra@gmail.com' },
  school: {
    name: 'Alpharetta High School',
    street: '3595 Webb Bridge Road',
    city: 'Alpharetta, GA 30005',
    phone: '470-254-7640 x. 27668',
    phoneHref: 'tel:+14702547640,27668',
  },
};

export const social = {
  instagram: 'https://www.instagram.com/alpharettaorchestra/',
  youtube: 'https://www.youtube.com/@AlpharettaHSOrchestras',
};

/* STILL ON SQUARESPACE. Payments, the handbook PDF and the program
   book stay on the old site for now. When the domain moves to this
   site, these URLs stop working: either keep Squarespace on a
   subdomain (e.g. store.alpharettaorchestra.com) and update STORE_HOST,
   or move the PDFs into public/ and point these at them. */
const STORE_HOST = 'https://www.alpharettaorchestra.com';

export const store = {
  home: `${STORE_HOST}/store`,
  dues: `${STORE_HOST}/store/orchestra-dues`,
  patron: `${STORE_HOST}/store/patron-program`,
  programBookAds: `${STORE_HOST}/store/program-book`,
};

export const docs = {
  handbook: `${STORE_HOST}/s/AHSO-Handbookdocx.pdf`,
  programBook: `${STORE_HOST}/s/books.pdf`,
};
