"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  LibraryCollectionKey,
  LibraryEntryFlags,
  LibraryPreparedFlags
} from "@/types/library";

type SessionLibraryCollections = Partial<
  Record<LibraryCollectionKey, Record<string, LibraryEntryFlags>>
>;

interface LibraryOrganizationState {
  sessions: Record<string, SessionLibraryCollections>;
  setFlag: (
    sessionCode: string,
    collection: LibraryCollectionKey,
    itemId: string,
    flag: keyof LibraryPreparedFlags,
    value: boolean
  ) => void;
  toggleFlag: (
    sessionCode: string,
    collection: LibraryCollectionKey,
    itemId: string,
    flag: keyof LibraryPreparedFlags
  ) => void;
  touchItem: (
    sessionCode: string,
    collection: LibraryCollectionKey,
    itemId: string
  ) => void;
  clearSessionLibrary: (sessionCode: string) => void;
}

export const EMPTY_LIBRARY_FLAGS: Readonly<Record<string, LibraryEntryFlags>> =
  Object.freeze({});

export function selectLibraryFlags(
  state: LibraryOrganizationState,
  sessionCode: string,
  collection: LibraryCollectionKey
) {
  return state.sessions[sessionCode]?.[collection] ?? EMPTY_LIBRARY_FLAGS;
}

function withEntryMutation(
  sessions: Record<string, SessionLibraryCollections>,
  sessionCode: string,
  collection: LibraryCollectionKey,
  itemId: string,
  mutator: (entry: LibraryEntryFlags) => LibraryEntryFlags
) {
  const sessionCollections = sessions[sessionCode] ?? {};
  const collectionEntries = sessionCollections[collection] ?? {};
  const currentEntry = collectionEntries[itemId] ?? {};

  return {
    ...sessions,
    [sessionCode]: {
      ...sessionCollections,
      [collection]: {
        ...collectionEntries,
        [itemId]: mutator(currentEntry)
      }
    }
  };
}

export const useLibraryOrganizationStore = create<LibraryOrganizationState>()(
  persist(
    (set) => ({
      sessions: {},
      setFlag: (sessionCode, collection, itemId, flag, value) =>
        set((state) => ({
          sessions: withEntryMutation(
            state.sessions,
            sessionCode,
            collection,
            itemId,
            (entry) => ({
              ...entry,
              [flag]: value,
              lastTouchedAt: new Date().toISOString()
            })
          )
        })),
      toggleFlag: (sessionCode, collection, itemId, flag) =>
        set((state) => ({
          sessions: withEntryMutation(
            state.sessions,
            sessionCode,
            collection,
            itemId,
            (entry) => ({
              ...entry,
              [flag]: !entry[flag],
              lastTouchedAt: new Date().toISOString()
            })
          )
        })),
      touchItem: (sessionCode, collection, itemId) =>
        set((state) => ({
          sessions: withEntryMutation(
            state.sessions,
            sessionCode,
            collection,
            itemId,
            (entry) => ({
              ...entry,
              lastTouchedAt: new Date().toISOString()
            })
          )
        })),
      clearSessionLibrary: (sessionCode) =>
        set((state) => {
          const nextSessions = { ...state.sessions };
          delete nextSessions[sessionCode];
          return { sessions: nextSessions };
        })
    }),
    {
      name: "daimyo-vtt-library-organization",
      version: 1,
      storage: createJSONStorage(() => localStorage)
    }
  )
);
