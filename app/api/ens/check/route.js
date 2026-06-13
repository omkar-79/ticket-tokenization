import { NextResponse } from "next/server";
import { validateEnsLabel } from "../../../../src/ens/identity.js";
import { checkLabelAvailable } from "../../../../src/ens/provision.js";
import { isEnsConfigured } from "../../../../src/ens/config.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLabel = searchParams.get("label");

    if (!rawLabel?.trim()) {
      return NextResponse.json({ error: "label query param is required" }, { status: 400 });
    }

    const label = validateEnsLabel(rawLabel);
    if (!isEnsConfigured()) {
      return NextResponse.json({
        available: true,
        label,
        configured: false,
        message: "ENS not configured — name reserved locally only",
      });
    }

    const result = await checkLabelAvailable(label);
    return NextResponse.json({
      label,
      configured: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ENS check failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
