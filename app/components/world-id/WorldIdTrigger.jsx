"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";
import Button from "../ui/Button.jsx";
import { fetchRpContext, getWorldIdClientConfig } from "../../lib/worldId.js";

export default function WorldIdTrigger({
  label = "Verify with World ID",
  onVerify,
  onSuccess,
  onError,
  disabled = false,
  autoStart = false,
  autoStartKey = null,
  hideButton = false,
}) {
  const [open, setOpen] = useState(false);
  const [requestConfig, setRequestConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastAutoStartKeyRef = useRef(null);

  const { appId, action, environment } = getWorldIdClientConfig();

  const handleOpen = useCallback(async () => {
    if (disabled) return;
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
  }, [action, appId, disabled, environment, onError]);

  useEffect(() => {
    if (!autoStart || disabled) return;
    if (autoStartKey == null) return;
    if (lastAutoStartKeyRef.current === autoStartKey) return;
    lastAutoStartKeyRef.current = autoStartKey;
    handleOpen();
  }, [autoStart, autoStartKey, disabled, handleOpen]);

  function handleSuccess(result) {
    setOpen(false);
    onSuccess?.(result);
  }

  if (!appId || !action) return null;

  return (
    <>
      {!hideButton && (
        <Button onClick={() => handleOpen()} loading={loading} disabled={disabled}>
          {label}
        </Button>
      )}
      {requestConfig && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          {...requestConfig}
          handleVerify={onVerify}
          onSuccess={handleSuccess}
          onError={(code) => onError?.(`World ID error: ${code}`)}
        />
      )}
    </>
  );
}
