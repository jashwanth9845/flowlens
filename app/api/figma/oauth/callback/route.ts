import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/server/auth";
import { createOAuthConnection, exchangeFigmaCode } from "@/lib/server/figma";
import { getEnv } from "@/lib/server/env";

export async function GET(request: Request) {
  const session = await auth();
  const env = getEnv();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in", env.appUrl));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("flowlens_figma_state")?.value;
  cookieStore.delete("flowlens_figma_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/app/settings/integrations/figma?error=state_mismatch", env.appUrl),
    );
  }

  const tokenData = await exchangeFigmaCode(code);
  await createOAuthConnection({
    userId: session.user.id,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt: tokenData.expiresAt,
  });

  return NextResponse.redirect(new URL("/app/settings/integrations/figma?connected=1", env.appUrl));
}
