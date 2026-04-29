import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import type { SessionViewerIdentity } from "@/types/session";

const SESSION_COOKIE_PREFIX = "daimyo-vtt-session";
const SIGNED_COOKIE_VERSION = "v1";

function getCookieName(sessionCode: string) {
  return `${SESSION_COOKIE_PREFIX}-${sessionCode.toLowerCase()}`;
}

function getCookieSecret() {
  const secret =
    process.env.DAIMYO_SESSION_COOKIE_SECRET ??
    process.env.SESSION_COOKIE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "";

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "Defina DAIMYO_SESSION_COOKIE_SECRET para assinar cookies de sessao."
    );
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "base64url");
  const rightBuffer = Buffer.from(right, "base64url");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isSessionViewerIdentity(value: unknown): value is SessionViewerIdentity {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<SessionViewerIdentity>;

  return (
    typeof candidate.sessionId === "string" &&
    typeof candidate.sessionCode === "string" &&
    typeof candidate.participantId === "string" &&
    typeof candidate.displayName === "string" &&
    (candidate.role === "gm" || candidate.role === "player")
  );
}

function parseViewerPayload(payload: string) {
  const parsed = JSON.parse(payload) as unknown;
  return isSessionViewerIdentity(parsed) ? parsed : null;
}

function readSignedViewerCookie(raw: string) {
  const [version, payload, signature] = raw.split(".");

  if (version !== SIGNED_COOKIE_VERSION || !payload || !signature) {
    return null;
  }

  const secret = getCookieSecret();

  if (!secret) {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);

  if (!signaturesMatch(signature, expectedSignature)) {
    return null;
  }

  return parseViewerPayload(decodeBase64Url(payload));
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
    const signed = readSignedViewerCookie(raw);

    if (signed) {
      return signed;
    }

    if (process.env.NODE_ENV !== "production") {
      return parseViewerPayload(raw);
    }

    return null;
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
  const secret = getCookieSecret();
  const payload = encodeBase64Url(JSON.stringify(identity));
  const value = secret
    ? `${SIGNED_COOKIE_VERSION}.${payload}.${signPayload(payload, secret)}`
    : JSON.stringify(identity);

  return {
    name: getCookieName(identity.sessionCode),
    value,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  };
}
