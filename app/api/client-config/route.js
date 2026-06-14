import { NextResponse } from "next/server";
import { getClientConfig } from "../../lib/clientConfig.js";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getClientConfig(), {
    headers: { "Cache-Control": "no-store" },
  });
}
