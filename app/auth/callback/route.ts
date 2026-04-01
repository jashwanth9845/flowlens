import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createServerSupabase();

  // Handle email confirmation link
  if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any });
    return NextResponse.redirect(`${origin}/?confirmed=true`);
  }

  // Handle code exchange (for OAuth or magic links if added later)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
