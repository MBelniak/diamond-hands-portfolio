import { uniqBy } from "lodash-es";
import type { PortfolioEvent, PortfolioEvents } from "@/lib/types";
import { getPositionIdFromClosedPositionEventId, isLegacyClosedPositionEventId } from "@/lib/xlsx-parser/utils";

const mergeById = <T extends { id: string }>(
  existing: T[],
  incoming: T[],
  shouldDropExisting?: (event: T) => boolean,
) => {
  const incomingIds = new Set(incoming.map((event) => event.id));
  return uniqBy(
    incoming.concat(existing.filter((event) => !incomingIds.has(event.id) && !shouldDropExisting?.(event))),
    "id",
  );
};

const mergeClosedPositionEvents = (existing: PortfolioEvent[], incoming: PortfolioEvent[]) => {
  const incomingPositionIds = new Set(incoming.map((event) => getPositionIdFromClosedPositionEventId(event.id)));
  // Legacy events were keyed by Position ID only, so they can't be matched one-to-one with the new rows, and
  // positions split into several rows were collapsed into one of them. Replace them with the freshly parsed rows
  // whenever the upload covers that position.
  return mergeById(
    existing,
    incoming,
    (event) => isLegacyClosedPositionEventId(event.id) && incomingPositionIds.has(event.id),
  );
};

/**
 * Merges a freshly parsed report into the events stored for the user. Events from the new report win over stored
 * events with the same id; stored events that the report doesn't cover (e.g. from older reports) are kept.
 */
export const mergePortfolioEvents = (existingEvents: PortfolioEvents, events: PortfolioEvents): PortfolioEvents => {
  return {
    cashEvents: mergeById(existingEvents.cashEvents, events.cashEvents),
    closedStocksOpenEvents: mergeClosedPositionEvents(
      existingEvents.closedStocksOpenEvents,
      events.closedStocksOpenEvents,
    ),
    closedStocksCloseEvents: mergeClosedPositionEvents(
      existingEvents.closedStocksCloseEvents,
      events.closedStocksCloseEvents,
    ),
  };
};
