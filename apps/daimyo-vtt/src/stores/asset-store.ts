"use client";

import { create } from "zustand";

import type { SessionAssetRecord } from "@/types/asset";

interface AssetState {
  scopeKey: string | null;
  assets: SessionAssetRecord[];
  hasHydrated: boolean;
  hydrateForScope: (scopeKey: string, assets: SessionAssetRecord[]) => void;
  setAssets: (assets: SessionAssetRecord[]) => void;
  upsertAsset: (asset: SessionAssetRecord) => void;
  removeAsset: (assetId: string) => void;
}

export const useAssetStore = create<AssetState>((set) => ({
  scopeKey: null,
  assets: [],
  hasHydrated: false,
  hydrateForScope: (scopeKey, assets) =>
    set((state) => {
      if (state.scopeKey === scopeKey && state.hasHydrated) {
        return state;
      }

      return { scopeKey, assets, hasHydrated: true };
    }),
  setAssets: (assets) => set((state) => ({ ...state, assets, hasHydrated: true })),
  upsertAsset: (asset) =>
    set((state) => {
      const assets = state.assets.filter((item) => item.id !== asset.id);
      assets.unshift(asset);
      return { ...state, assets, hasHydrated: true };
    }),
  removeAsset: (assetId) =>
    set((state) => ({
      ...state,
      assets: state.assets.filter((asset) => asset.id !== assetId)
    }))
}));
