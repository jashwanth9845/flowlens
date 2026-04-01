import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/figma/images
 * Renders Figma frames as PNG images.
 *
 * Body: { token, fileKey, nodeIds: string[] }
 * Returns: { images: { [nodeId]: imageUrl } }
 */
export async function POST(req: NextRequest) {
  try {
    const { token, fileKey, nodeIds } = await req.json();
    if (!token || !fileKey || !nodeIds?.length)
      return NextResponse.json({ error: "token, fileKey, and nodeIds required" }, { status: 400 });

    // Figma accepts comma-separated node IDs
    const ids = nodeIds.join(",");
    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=2`;

    const res = await fetch(url, {
      headers: { "X-Figma-Token": token },
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: `Figma ${res.status}: ${t}` }, { status: res.status });
    }

    const data = await res.json();
    // data.images = { "nodeId": "https://..." }
    return NextResponse.json({ images: data.images || {} });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
