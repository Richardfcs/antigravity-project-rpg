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
  maps: SessionMapRecord[];
  mapTokens: MapTokenRecord[];
  setMaps: (maps: SessionMapRecord[]) => void;
  upsertMap: (map: SessionMapRecord) => void;
  removeMap: (mapId: string) => void;
  setMapTokens: (tokens: MapTokenRecord[]) => void;
  upsertMapToken: (token: MapTokenRecord) => void;
  removeMapToken: (tokenId: string) => void;
}

export const useMapStore = create<MapState>((set) => ({
  maps: [],
  mapTokens: [],
  setMaps: (maps) => set({ maps: sortMaps(maps) }),
  upsertMap: (map) =>
    set((state) => ({
      maps: sortMaps([...state.maps.filter((item) => item.id !== map.id), map])
    })),
  removeMap: (mapId) =>
    set((state) => ({
      maps: state.maps.filter((map) => map.id !== mapId),
      mapTokens: state.mapTokens.filter((token) => token.mapId !== mapId)
    })),
  setMapTokens: (tokens) => set({ mapTokens: sortMapTokens(tokens) }),
  upsertMapToken: (token) =>
    set((state) => ({
      mapTokens: sortMapTokens([
        ...state.mapTokens.filter((item) => item.id !== token.id),
        token
      ])
    })),
  removeMapToken: (tokenId) =>
    set((state) => ({
      mapTokens: state.mapTokens.filter((token) => token.id !== tokenId)
    }))
}));
