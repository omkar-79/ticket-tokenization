"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Button from "../ui/Button.jsx";
import { formatCameraError, requestCameraAccess } from "../../lib/camera.js";

async function safeStopScanner(scanner, runningRef, stoppedRef) {
  if (!scanner || stoppedRef.current) return;
  stoppedRef.current = true;
  if (runningRef.current) {
    try {
      await scanner.stop();
    } catch {
      /* not running or already stopped */
    }
    runningRef.current = false;
  }
  try {
    scanner.clear();
  } catch {
    /* ignore */
  }
}

function cameraConfig(deviceId) {
  if (deviceId) {
    return { deviceId: { exact: deviceId } };
  }
  return { facingMode: "environment" };
}

export default function GateQrScanner({ cameraDeviceId, cameraReady = false, onScan, onClose }) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef(null);
  const runningRef = useRef(false);
  const stoppedRef = useRef(false);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [deviceId, setDeviceId] = useState(cameraDeviceId ?? null);
  const [ready, setReady] = useState(cameraReady);
  const [permissionPending, setPermissionPending] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [startKey, setStartKey] = useState(0);

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const stopAndClose = useCallback(async () => {
    await safeStopScanner(scannerRef.current, runningRef, stoppedRef);
    onCloseRef.current();
  }, []);

  async function allowCamera() {
    setPermissionPending(true);
    setCameraError(null);
    try {
      const { deviceId: id } = await requestCameraAccess();
      setDeviceId(id);
      setReady(true);
      setPermissionPending(false);
      setStartKey((k) => k + 1);
    } catch (err) {
      setPermissionPending(false);
      setCameraError(formatCameraError(err));
    }
  }

  useEffect(() => {
    if (!ready) return undefined;

    let cancelled = false;
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    runningRef.current = false;
    stoppedRef.current = false;
    handledRef.current = false;
    setCameraError(null);

    scanner
      .start(
        cameraConfig(deviceId),
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (handledRef.current || cancelled) return;
          handledRef.current = true;
          onScanRef.current(decodedText);
        },
        () => {}
      )
      .then(() => {
        if (!cancelled) {
          runningRef.current = true;
        } else {
          safeStopScanner(scanner, runningRef, stoppedRef);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCameraError(formatCameraError(err));
        }
      });

    return () => {
      cancelled = true;
      safeStopScanner(scanner, runningRef, stoppedRef);
    };
  }, [regionId, deviceId, startKey, ready]);

  const showPermissionPrompt = !ready && !cameraError;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <p className="text-sm text-text">Point at the fan&apos;s ticket QR</p>
        <Button variant="ghost" onClick={() => stopAndClose()}>
          Close
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {showPermissionPrompt ? (
          <div className="flex flex-col items-center gap-4 max-w-sm text-center">
            <p className="text-sm text-text leading-relaxed">
              Camera access is required to scan ticket QR codes. Tap below — your browser will
              ask for permission.
            </p>
            <Button
              onClick={() => allowCamera()}
              loading={permissionPending}
              className="text-base px-8 py-3"
            >
              Allow camera
            </Button>
          </div>
        ) : cameraError ? (
          <div className="flex flex-col items-center gap-4 max-w-sm text-center">
            <p className="text-sm text-error leading-relaxed">{cameraError}</p>
            <Button
              onClick={() => allowCamera()}
              loading={permissionPending}
              className="text-base px-8 py-3"
            >
              Allow camera
            </Button>
          </div>
        ) : (
          <>
            <div
              id={regionId}
              className="w-full max-w-sm overflow-hidden rounded-lg border border-white/20"
            />
            <p className="text-xs text-muted text-center max-w-xs">
              Hold steady until the ticket is recognized. Entry is granted automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
