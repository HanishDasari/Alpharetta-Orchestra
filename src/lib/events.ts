import { getCollection, type CollectionEntry } from 'astro:content';

export type EventEntry = CollectionEntry<'events'>;

/** Every published event, oldest first. */
export async function allEvents(): Promise<EventEntry[]> {
  const events = await getCollection('events', ({ data }) => !data.draft);
  return events.sort((a, b) => a.data.start.getTime() - b.data.start.getTime());
}

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
