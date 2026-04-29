"use client";

import { useState } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { CampaignActionsPanel } from "@/components/lobby/campaign-actions-panel";
import type { InfraReadiness } from "@/types/infra";
import type { LinkedSessionSummary } from "@/types/session";

interface LobbyShellProps {
  infra: InfraReadiness;
  presetCode?: string;
}

export function LobbyShell({ infra, presetCode = "" }: LobbyShellProps) {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    email: string | null;
    userId: string | null;
    linkedSessions: LinkedSessionSummary[];
  }>({
    isAuthenticated: false,
    email: null,
    userId: null,
    linkedSessions: []
  });
  const [authenticatedView, setAuthenticatedView] = useState<"sessions" | "campaigns">(
    "sessions"
  );

  const handleAuthenticatedChange = (nextState: {
    isAuthenticated: boolean;
    email: string | null;
    userId: string | null;
    linkedSessions: LinkedSessionSummary[];
  }) => {
    setAuthState(nextState);
    if (nextState.isAuthenticated) {
      setAuthenticatedView("sessions");
    }
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-[540px]">
          <AuthPanel
            variant="login-only"
            onAuthenticatedChange={handleAuthenticatedChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-start">
      <div className="w-full">
        {authenticatedView === "campaigns" ? (
            <CampaignActionsPanel
              infra={infra}
              presetCode={presetCode}
              onBack={() => setAuthenticatedView("sessions")}
              linkedSessions={authState.linkedSessions}
            />
        ) : (
          <AuthPanel
            variant="account"
            onAuthenticatedChange={handleAuthenticatedChange}
            onOpenCampaigns={() => setAuthenticatedView("campaigns")}
          />
        )}
      </div>
    </div>
  );
}
