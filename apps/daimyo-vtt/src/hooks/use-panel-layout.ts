"use client";

import { useUiShellStore } from "@/stores/ui-shell-store";

export function usePanelLayout() {
  const masterColumns = useUiShellStore((state) => state.masterColumns);
  const masterRows = useUiShellStore((state) => state.masterRows);
  const setMasterColumns = useUiShellStore((state) => state.setMasterColumns);
  const setMasterRows = useUiShellStore((state) => state.setMasterRows);

  return {
    masterColumns,
    masterRows,
    setMasterColumns,
    setMasterRows
  };
}
