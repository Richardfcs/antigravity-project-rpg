import "server-only";

import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import type { SessionViewerIdentity } from "@/types/session";

const SESSION_COOKIE_PREFIX = "daimyo-vtt-session";

function getCookieName(sessionCode: string) {
  return `${SESSION_COOKIE_PREFIX}-${sessionCode.toLowerCase()}`;
}

export function readSessionViewerCookie(
  cookieStore: Pick<ReadonlyRequestCookies, "get">,
  sessionCode: string
) {
  const raw = cookieStore.get(getCookieName(sessionCode))?.value;

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionViewerIdentity;
  } catch {
    return null;
  }
}

export function buildSessionViewerCookie(
  identity: SessionViewerIdentity
): {
  name: string;
  value: string;
  maxAge: number;
  path: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    name: getCookieName(identity.sessionCode),
    value: JSON.stringify(identity),
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  };
}
