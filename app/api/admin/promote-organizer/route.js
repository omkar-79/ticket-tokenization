import { NextResponse } from "next/server";
import { setRole, findByAccountId } from "../../../../src/db/users.js";

export async function POST(request) {
  try {
    const secret = request.headers.get("x-admin-secret");
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const user = findByAccountId(accountId);
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const updated = setRole(accountId, "organizer");
    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Promotion failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
