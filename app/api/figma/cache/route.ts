import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/figma/cache
 * 
 * Downloads a Figma-rendered image server-side (no CORS) and uploads to Supabase Storage.
 * Returns the permanent public URL.
 * 
 * Body: { imageUrl, storagePath, screenId }
 */
export async function POST(req: NextRequest) {
  try {
    const { imageUrl, storagePath, screenId } = await req.json();
    if (!imageUrl || !storagePath || !screenId) {
      return NextResponse.json({ error: "imageUrl, storagePath, screenId required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // Download image server-side (no CORS issues)
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Failed to download image: ${imgRes.status}` }, { status: 502 });
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/png";

    // Upload to Supabase Storage using service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceKey);
    
    const { error: uploadErr } = await supabase.storage
      .from("screenshots")
      .upload(storagePath, buffer, {
        upsert: true,
        contentType,
      });

    if (uploadErr) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    // Update screen record with cached path
    await supabase.from("screens").update({
      image_url: imageUrl,
      cached_image_path: storagePath,
    }).eq("id", screenId);

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/screenshots/${storagePath}`;
    return NextResponse.json({ publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
