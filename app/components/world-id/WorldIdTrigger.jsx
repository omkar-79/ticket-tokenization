"use client";

import { useState } from "react";
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";
import Button from "../ui/Button.jsx";
import { fetchRpContext, getWorldIdClientConfig } from "../../lib/worldId.js";

export default function WorldIdTrigger({
  label = "Verify with World ID",
  onVerify,
  onSuccess,
  onError,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [requestConfig, setRequestConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  const { appId, action, environment } = getWorldIdClientConfig();

  async function handleOpen() {
    setLoading(true);
    try {
      const rp_context = await fetchRpContext();
      setRequestConfig({
        app_id: appId,
        action,
        rp_context,
        allow_legacy_proofs: true,
        environment,
        preset: deviceLegacy(),
      });
      setOpen(true);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to start verification");
    } finally {
      setLoading(false);
    }
  }

  if (!appId || !action) return null;

  return (
    <>
      <Button onClick={handleOpen} loading={loading} disabled={disabled}>
        {label}
      </Button>
      {requestConfig && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          {...requestConfig}
          handleVerify={onVerify}
          onSuccess={onSuccess}
          onError={(code) => onError?.(`World ID error: ${code}`)}
        />
      )}
    </>
  );
}
