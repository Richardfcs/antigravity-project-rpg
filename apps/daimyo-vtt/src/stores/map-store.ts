"use client";

import { create } from "zustand";

import type { MapTokenRecord, SessionMapRecord } from "@/types/map";

function sortMaps(maps: SessionMapRecord[]) {
  return [...maps].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
}

function sortMapTokens(tokens: MapTokenRecord[]) {
  return [...tokens].sort((left, right) => {
    if (left.mapId !== right.mapId) {
      return left.mapId.localeCompare(right.mapId);
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

interface MapState {
  scopeKey: string | null;
  maps: SessionMapRecord[];
  mapTokens: MapTokenRecord[];
  hasHydrated: boolean;
  hydrateForScope: (
    scopeKey: string,
    maps: SessionMapRecord[],
    tokens: MapTokenRecord[]
  ) => void;
  setMaps: (maps: SessionMapRecord[]) => void;
  upsertMap: (map: SessionMapRecord) => void;
  removeMap: (mapId: string) => void;
  setMapTokens: (tokens: MapTokenRecord[]) => void;
  upsertMapToken: (token: MapTokenRecord) => void;
  removeMapToken: (tokenId: string) => void;
}

export const useMapStore = create<MapState>((set) => ({
  scopeKey: null,
  maps: [],
  mapTokens: [],
  hasHydrated: false,
  hydrateForScope: (scopeKey, maps, tokens) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return {
        scopeKey,
        maps: sortMaps(maps),
        mapTokens: sortMapTokens(tokens),
        hasHydrated: true
      };
    }),
  setMaps: (maps) =>
    set((state) => ({ ...state, maps: sortMaps(maps), hasHydrated: true })),
  upsertMap: (map) =>
    set((state) => ({
      ...state,
      maps: sortMaps([...state.maps.filter((item) => item.id !== map.id), map]),
      hasHydrated: true
    })),
  removeMap: (mapId) =>
    set((state) => ({
      ...state,
      maps: state.maps.filter((map) => map.id !== mapId),
      mapTokens: state.mapTokens.filter((token) => token.mapId !== mapId)
    })),
  setMapTokens: (tokens) =>
    set((state) => ({
      ...state,
      mapTokens: sortMapTokens(tokens),
      hasHydrated: true
    })),
  upsertMapToken: (token) =>
    set((state) => ({
      ...state,
      mapTokens: sortMapTokens([
        ...state.mapTokens.filter((item) => item.id !== token.id),
        token
      ]),
      hasHydrated: true
    })),
  removeMapToken: (tokenId) =>
    set((state) => ({
      ...state,
      mapTokens: state.mapTokens.filter((token) => token.id !== tokenId)
    }))
}));
