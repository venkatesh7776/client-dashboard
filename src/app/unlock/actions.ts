"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

export async function unlock(_: string | null, form: FormData): Promise<string | null> {
  const expected = process.env.APP_PASSCODE;
  const given = String(form.get("passcode") ?? "").trim();
  const next = String(form.get("next") ?? "/");
  if (expected && given !== expected) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return "Wrong passcode";
  }
  (await cookies()).set(AUTH_COOKIE, await passcodeToken(expected ?? ""), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
