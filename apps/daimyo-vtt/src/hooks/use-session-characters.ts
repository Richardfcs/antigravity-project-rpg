"use client";

import { useEffect } from "react";

import {
  createEmptySheetProfile,
  mirrorSummaryIntoSheetProfile,
  normalizeSheetProfile
} from "@/lib/combat/sheet-profile";
import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useCharacterStore } from "@/stores/character-store";
import type { SessionCharacterRecord, CharacterType, CharacterTier } from "@/types/character";

interface CharacterRowPayload {
  id: string;
  session_id: string;
  name: string;
  type: CharacterType;
  tier: CharacterTier;
  owner_participant_id: string | null;
  asset_id: string | null;
  hp: number;
  hp_max: number;
  fp: number;
  fp_max: number;
  initiative: number;
  sheet_profile?: unknown | null;
  created_at: string;
  updated_at: string;
}

interface UseSessionCharactersOptions {
  sessionId: string;
  initialCharacters: SessionCharacterRecord[];
  enabled?: boolean;
}

function mapCharacterPayload(row: CharacterRowPayload): SessionCharacterRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    type: row.type,
    tier: row.tier,
    ownerParticipantId: row.owner_participant_id,
    assetId: row.asset_id,
    hp: row.hp,
    hpMax: row.hp_max,
    fp: row.fp,
    fpMax: row.fp_max,
    initiative: row.initiative,
    sheetProfile: mirrorSummaryIntoSheetProfile(
      normalizeSheetProfile(
        row.sheet_profile,
        createEmptySheetProfile({
          name: row.name,
          attributes: {
            hpMax: row.hp_max,
            fpMax: row.fp_max
          }
        })
      ),
      {
        hp: row.hp,
        hpMax: row.hp_max,
        fp: row.fp,
        fpMax: row.fp_max
      }
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function useSessionCharacters({
  sessionId,
  initialCharacters,
  enabled = true
}: UseSessionCharactersOptions) {
  const setCharacters = useCharacterStore((state) => state.setCharacters);
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const removeCharacter = useCharacterStore((state) => state.removeCharacter);

  useEffect(() => {
    setCharacters(initialCharacters);
  }, [initialCharacters, setCharacters]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    let client;

    try {
      client = createBrowserSupabaseClient();
    } catch {
      return;
    }

    return subscribeToSlice({
      client,
      channelName: `session-characters:${sessionId}`,
      pollMs: 7000,
      maxPollMs: 16000,
      reconcile: async () => {
        const nextResult = await client
          .from("session_characters")
          .select(
            "id,session_id,name,type,tier,owner_participant_id,asset_id,hp,hp_max,fp,fp_max,initiative,sheet_profile,created_at,updated_at"
          )
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (!nextResult.error && nextResult.data) {
          setCharacters((nextResult.data as CharacterRowPayload[]).map(mapCharacterPayload));
          return;
        }

        const fallbackResult = await client
          .from("session_characters")
          .select(
            "id,session_id,name,type,tier,owner_participant_id,asset_id,hp,hp_max,fp,fp_max,initiative,created_at,updated_at"
          )
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (!fallbackResult.error && fallbackResult.data) {
          setCharacters((fallbackResult.data as CharacterRowPayload[]).map(mapCharacterPayload));
        }
      },
      register: (channel) =>
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "session_characters",
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              if (payload.old && typeof payload.old.id === "string") {
                removeCharacter(payload.old.id);
              }

              return;
            }

            if (payload.new) {
              upsertCharacter(mapCharacterPayload(payload.new as CharacterRowPayload));
            }
          }
        )
    });
  }, [enabled, removeCharacter, sessionId, setCharacters, upsertCharacter]);
}
