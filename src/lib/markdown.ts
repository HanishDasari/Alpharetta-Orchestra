import { Marked } from 'marked';

/* Markdown typed into the portal, turned into HTML for the site.

   Raw HTML in the text is dropped, not passed through. The webmaster
   is a student account, and nothing typed into an editor should be
   able to put a <script> (or anything else unexpected) on the public
   site. Markdown covers everything the editors need. Links are limited
   to http(s), mailto and tel for the same reason. */

const safe = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html: () => '',
  },
  walkTokens(token) {
    if ((token.type === 'link' || token.type === 'image') && !/^(https?:|mailto:|tel:|\/|#)/i.test(token.href)) {
      token.href = '#';
    }
  },
});

export function renderMarkdown(src: string | null | undefined): string {
  return safe.parse(src ?? '', { async: false }) as string;
}
