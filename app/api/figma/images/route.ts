import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, fileKey, nodeIds } = await req.json();
    if (!token || !fileKey || !nodeIds?.length)
      return NextResponse.json({ error: "token, fileKey, nodeIds required" }, { status: 400 });

    const res = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeIds.join(","))}&format=png&scale=2`,
      { headers: { "X-Figma-Token": token } }
    );
    if (!res.ok) return NextResponse.json({ error: `Figma ${res.status}` }, { status: res.status });

    const data = await res.json();
    return NextResponse.json({ images: data.images || {} });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
