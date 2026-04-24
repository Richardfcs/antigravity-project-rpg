import type {
  LibraryEntryFlags,
  LibraryLoadMoreState,
  LibrarySortMode,
  LibraryStatusFilter
} from "@/types/library";

export function normalizeLibraryQuery(query: string) {
  return query.trim().toLowerCase();
}

export function filterLibraryItems<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string
) {
  const normalizedQuery = normalizeLibraryQuery(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    getSearchText(item).toLowerCase().includes(normalizedQuery)
  );
}

export function sliceLibraryItems<T>(items: T[], visibleCount: number) {
  return items.slice(0, visibleCount);
}

export function matchesLibraryStatusFilter(
  flags: LibraryEntryFlags | undefined,
  filter: LibraryStatusFilter
) {
  switch (filter) {
    case "prepared":
      return Boolean(flags?.prepared);
    case "favorite":
      return Boolean(flags?.favorite);
    case "usedToday":
      return Boolean(flags?.usedToday);
    case "all":
    default:
      return true;
  }
}

export function filterLibraryItemsByStatus<T>(
  items: T[],
  statusFilter: LibraryStatusFilter,
  getFlags: (item: T) => LibraryEntryFlags | undefined
) {
  if (statusFilter === "all") {
    return items;
  }

  return items.filter((item) => matchesLibraryStatusFilter(getFlags(item), statusFilter));
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

function compareLabels(left: string, right: string) {
  return collator.compare(left, right);
}

export function sortLibraryItems<T>(
  items: T[],
  options: {
    sortMode: LibrarySortMode;
    getLabel: (item: T) => string;
    getFlags: (item: T) => LibraryEntryFlags | undefined;
  }
) {
  const { sortMode, getLabel, getFlags } = options;

  return [...items].sort((left, right) => {
    const leftFlags = getFlags(left);
    const rightFlags = getFlags(right);

    if (sortMode === "favorite") {
      const leftScore = Number(Boolean(leftFlags?.favorite));
      const rightScore = Number(Boolean(rightFlags?.favorite));
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
    }

    if (sortMode === "prepared") {
      const leftScore = Number(Boolean(leftFlags?.prepared));
      const rightScore = Number(Boolean(rightFlags?.prepared));
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
    }

    if (sortMode === "recent") {
      const leftTimestamp = leftFlags?.lastTouchedAt
        ? new Date(leftFlags.lastTouchedAt).getTime()
        : 0;
      const rightTimestamp = rightFlags?.lastTouchedAt
        ? new Date(rightFlags.lastTouchedAt).getTime()
        : 0;

      if (leftTimestamp !== rightTimestamp) {
        return rightTimestamp - leftTimestamp;
      }
    }

    return compareLabels(getLabel(left), getLabel(right));
  });
}

export function buildLoadMoreState(
  visibleCount: number,
  totalCount: number
): LibraryLoadMoreState {
  return {
    visibleCount,
    totalCount,
    hasMore: totalCount > visibleCount
  };
}
