import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/figma
 *
 * Proxies requests to the Figma REST API.
 * Solves CORS — browser can't call api.figma.com directly.
 *
 * Body: { token: string; fileKey: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { token, fileKey } = await req.json();

    if (!token || !fileKey) {
      return NextResponse.json(
        { error: "token and fileKey are required" },
        { status: 400 }
      );
    }

    // Fetch full file (includes all nodes, bounding boxes, names)
    const url = `https://api.figma.com/v1/files/${fileKey}?geometry=paths`;

    const figmaRes = await fetch(url, {
      headers: { "X-Figma-Token": token },
    });

    if (!figmaRes.ok) {
      const errText = await figmaRes.text();
      return NextResponse.json(
        { error: `Figma API ${figmaRes.status}: ${errText}` },
        { status: figmaRes.status }
      );
    }

    const data = await figmaRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
