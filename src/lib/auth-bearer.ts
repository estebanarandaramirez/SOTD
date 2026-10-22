/** Decode a Supabase Bearer JWT without a network call. Used by mobile clients
 *  that call web API routes with no cookie session to verify against. */
export function getUserFromBearer(token: string): { id: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    if (
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      Date.now() / 1000 > payload.exp ||
      !String(payload.iss ?? "").startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    ) {
      return null;
    }
    return { id: payload.sub };
  } catch {
    return null;
  }
}
