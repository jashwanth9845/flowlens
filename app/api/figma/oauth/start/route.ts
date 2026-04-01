import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/server/auth";
import { getFigmaAuthorizeUrl } from "@/lib/server/figma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  const state = randomUUID();
  const authorizeUrl = getFigmaAuthorizeUrl(state);
  if (!authorizeUrl) {
    return NextResponse.redirect(
      new URL("/app/settings/integrations/figma?error=oauth_not_configured", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("flowlens_figma_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(authorizeUrl);
}
