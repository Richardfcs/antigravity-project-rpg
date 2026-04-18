import { randomInt } from "node:crypto";

const SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createChunk(length: number) {
  return Array.from({ length }, () =>
    SESSION_CODE_ALPHABET[randomInt(0, SESSION_CODE_ALPHABET.length)]
  ).join("");
}

export function generateSessionCode() {
  return `${createChunk(4)}-${createChunk(2)}`;
}

export function normalizeSessionCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^(.{4})(.+)$/u, "$1-$2")
    .slice(0, 7);
}

export function sanitizeName(value: string, maxLength = 48) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}
