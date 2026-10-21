import { getEvents, type SiteEvent } from './content';

export type EventEntry = SiteEvent;

/**
 * Time zone to display an event's dates in. Timed events are shown in
 * Eastern time. All-day events are written as bare dates (2027-03-14),
 * which parse as midnight UTC — read back in Eastern time that becomes
 * the evening before, so they're displayed in UTC instead.
 */
export function displayZone(allDay: boolean): string {
  return allDay ? 'UTC' : 'America/New_York';
}

/** Every published event, oldest first. */
export const allEvents = getEvents;

/**
 * An event counts as "past" once its end time (or its start, if no end
 * was given) is behind us. This is the whole trick: nobody ever has to
 * move an event to a Past Events page by hand.
 */
function endOf(e: EventEntry): number {
  return (e.data.end ?? e.data.start).getTime();
}

export async function upcomingEvents(limit?: number): Promise<EventEntry[]> {
  const now = Date.now();
  const list = (await allEvents()).filter((e) => endOf(e) >= now);
  return limit ? list.slice(0, limit) : list;
}

export async function pastEvents(limit?: number): Promise<EventEntry[]> {
  const now = Date.now();
  const list = (await allEvents())
    .filter((e) => endOf(e) < now)
    .reverse(); // most recent first
  return limit ? list.slice(0, limit) : list;
}
