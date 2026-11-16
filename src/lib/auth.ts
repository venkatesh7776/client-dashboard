export const AUTH_COOKIE = "cd_auth";

/** Cookie value = SHA-256 of the passcode (works in middleware and Node). */
export async function passcodeToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`client-desk:${passcode}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
