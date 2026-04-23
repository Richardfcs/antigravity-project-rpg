"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  linkViewerToAuthAction,
  restoreSessionViewerByAuthAction
} from "@/app/actions/session-actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { SessionViewerIdentity } from "@/types/session";

interface AuthSessionBridgeProps {
  sessionCode: string;
  role: "gm" | "player";
  viewer: SessionViewerIdentity | null;
}

export function AuthSessionBridge({
  sessionCode,
  role,
  viewer
}: AuthSessionBridgeProps) {
  const router = useRouter();
  const attemptedRef = useRef<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let client;

    try {
      client = createBrowserSupabaseClient();
    } catch {
      return;
    }

    const syncViewer = async () => {
      const {
        data: { session }
      } = await client.auth.getSession();

      if (!isMounted || !session?.access_token || !session.user.id) {
        return;
      }

      const attemptKey = `${session.user.id}:${sessionCode}:${role}:${viewer?.participantId ?? "anonymous"}`;

      if (attemptedRef.current === attemptKey) {
        return;
      }

      attemptedRef.current = attemptKey;

      if (viewer) {
        const result = await linkViewerToAuthAction({
          sessionCode,
          accessToken: session.access_token
        });

        if (!isMounted) {
          return;
        }

        if (result.ok) {
          setStatusLabel("Conta autenticada vinculada a esta mesa.");
        }

        return;
      }

      const result = await restoreSessionViewerByAuthAction({
        sessionCode,
        role,
        accessToken: session.access_token
      });

      if (!isMounted) {
        return;
      }

      if (result.ok && result.route) {
        setStatusLabel("Mesa restaurada pela sua conta.");
        router.refresh();
      }
    };

    void syncViewer();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(() => {
      attemptedRef.current = null;
      void syncViewer();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [role, router, sessionCode, viewer]);

  if (!statusLabel) {
    return null;
  }

  return (
    <span className="hud-chip border-emerald-300/18 bg-emerald-300/10 text-emerald-50">
      <ShieldCheck size={14} />
      {statusLabel}
    </span>
  );
}
