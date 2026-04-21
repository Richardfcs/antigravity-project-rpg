export type LibrarySortDirection = "asc" | "desc";
export type LibraryCollectionKey =
  | "scenes"
  | "maps"
  | "atlas"
  | "audio"
  | "characters"
  | "assets";
export type LibraryStatusFilter =
  | "all"
  | "prepared"
  | "favorite"
  | "usedToday";
export type LibrarySortMode = "name" | "favorite" | "prepared" | "recent";

export interface LibraryQueryState {
  query: string;
  visibleCount: number;
  sortDirection?: LibrarySortDirection;
  tags?: string[];
}

export interface LibraryPreparedFlags {
  prepared?: boolean;
  favorite?: boolean;
  usedToday?: boolean;
  hidden?: boolean;
  revealed?: boolean;
}

export interface LibraryEntryFlags extends LibraryPreparedFlags {
  lastTouchedAt?: string | null;
}

export interface LibraryPreparedSummaryEntry {
  id: string;
  label: string;
  collection: LibraryCollectionKey;
  prepared?: boolean;
  favorite?: boolean;
  usedToday?: boolean;
}

export interface SessionLibrarySummary {
  preparedCount: number;
  favoriteCount: number;
  usedTodayCount: number;
  readyEntries: LibraryPreparedSummaryEntry[];
  favoriteEntries: LibraryPreparedSummaryEntry[];
}

export interface LibraryLoadMoreState {
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
}
