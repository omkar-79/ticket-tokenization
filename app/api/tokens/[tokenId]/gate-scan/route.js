import { NextResponse } from "next/server";

/** Direct gate scan without holder World ID confirmation is disabled. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct gate scan is disabled. Scan the holder's signed QR to start World ID confirmation.",
    },
    { status: 410 }
  );
}
