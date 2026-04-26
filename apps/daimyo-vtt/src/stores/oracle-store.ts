import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OracleLogEntry {
  id: string;
  timestamp: string;
  type: 'plot' | 'reaction' | 'npc' | 'journey' | 'enemy' | 'taint';
  title: string;
  summary: string;
  details: any;
}

interface OracleStore {
  history: OracleLogEntry[];
  addEntry: (entry: Omit<OracleLogEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
}

export const useOracleStore = create<OracleStore>()(
  persist(
    (set) => ({
      history: [],
      addEntry: (entry) => set((state) => ({
        history: [
          {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
          },
          ...state.history
        ].slice(0, 50) // Limite de 50 entradas
      })),
      clearHistory: () => set({ history: [] })
    }),
    {
      name: "daimyo-oracle-storage"
    }
  )
);
