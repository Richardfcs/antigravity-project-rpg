"use client";

import { create } from "zustand";

import type { SessionNoteRecord } from "@/types/note";

function sortNotes(notes: SessionNoteRecord[]) {
  return [...notes].sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
}

interface SessionNoteState {
  notes: SessionNoteRecord[];
  setNotes: (notes: SessionNoteRecord[]) => void;
  upsertNote: (note: SessionNoteRecord) => void;
  removeNote: (noteId: string) => void;
}

export const useSessionNoteStore = create<SessionNoteState>((set) => ({
  notes: [],
  setNotes: (notes) => set({ notes: sortNotes(notes) }),
  upsertNote: (note) =>
    set((state) => ({
      notes: sortNotes([...state.notes.filter((item) => item.id !== note.id), note])
    })),
  removeNote: (noteId) =>
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== noteId)
    }))
}));
