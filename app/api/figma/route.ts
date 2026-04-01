import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, fileKey } = await req.json();
    if (!token || !fileKey)
      return NextResponse.json({ error: "token and fileKey required" }, { status: 400 });

    const res = await fetch(
      `https://api.figma.com/v1/files/${fileKey}?geometry=paths`,
      { headers: { "X-Figma-Token": token } }
    );

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: `Figma ${res.status}: ${t}` }, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
