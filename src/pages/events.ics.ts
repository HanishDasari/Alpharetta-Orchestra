import type { APIRoute } from 'astro';
import { allEvents } from '../lib/events';

/* ---------------------------------------------------------------
   Generates a subscribable calendar feed at /events.ics.
   Families subscribe once; every concert the director adds shows up
   in their phone calendar without anyone re-sending anything.
   --------------------------------------------------------------- */

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** RFC 5545 requires escaping these, and folding lines at 75 octets. */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(' ' + rest);
  return parts.join('\r\n');
}

export const GET: APIRoute = async ({ site }) => {
  const events = await allEvents();
  const origin = site?.origin ?? 'https://www.alpharettaorchestra.com';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AHS Orchestras//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:AHS Orchestras',
    'X-WR-TIMEZONE:America/New_York',
  ];

  for (const e of events) {
    const { title, start, end, location, summary, ensembles } = e.data;
    // Default to a 2-hour block when no end time was entered.
    const finish = end ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const desc = [summary, ensembles.length ? `Performing: ${ensembles.join(', ')}` : null]
      .filter(Boolean)
      .join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.slug}@alpharettaorchestra.com`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(finish)}`,
      fold(`SUMMARY:${esc(title)}`),
      location ? fold(`LOCATION:${esc(location)}`) : '',
      desc ? fold(`DESCRIPTION:${esc(desc)}`) : '',
      `URL:${origin}/events/${e.slug}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.filter(Boolean).join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="ahs-orchestras.ics"',
    },
  });
};
