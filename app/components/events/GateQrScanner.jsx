"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import Button from "../ui/Button.jsx";
import TicketCheckedInOverlay from "../tickets/TicketCheckedInOverlay.jsx";
import { formatCameraError } from "../../lib/camera.js";

const START_TIMEOUT_MS = 15000;

/** One scanner at a time — prevents a hung stream blocking the next open. */
let activeScannerInstance = null;

async function stopScannerInstance(scanner) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    /* already stopped */
  }
  try {
    scanner.clear();
  } catch {
    /* ignore */
  }
}

async function releaseActiveScanner() {
  if (!activeScannerInstance) return;
  const scanner = activeScannerInstance;
  activeScannerInstance = null;
  await stopScannerInstance(scanner);
}

function clearRegionElement(regionId) {
  const el = document.getElementById(regionId);
  if (el) el.innerHTML = "";
}

function cameraConfig(deviceId) {
  if (deviceId) {
    return { deviceId: { exact: deviceId } };
  }
  return { facingMode: "environment" };
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export default function GateQrScanner({
  onScan,
  onClose,
  autoStart = false,
  eventName,
  scanStatus = null,
  waitingForHolder = false,
  onCancelVerification,
  cancelLoading = false,
}) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef(null);
  const sessionRef = useRef(0);
  const handledRef = useRef(false);
  const dismissTimerRef = useRef(null);
  const scanSuccessRef = useRef(null);
  const mountedRef = useRef(true);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [phase, setPhase] = useState(autoStart ? "opening" : "permission");
  const [permissionPending, setPermissionPending] = useState(autoStart);
  const [cameraError, setCameraError] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    scanSuccessRef.current = scanSuccess;
  }, [scanSuccess]);

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const stopLocalScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      if (activeScannerInstance === scanner) {
        activeScannerInstance = null;
      }
      await stopScannerInstance(scanner);
    }
    clearRegionElement(regionId);
  }, [regionId]);

  const stopAndClose = useCallback(async () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    sessionRef.current += 1;
    await stopLocalScanner();
    onCloseRef.current();
  }, [stopLocalScanner]);

  const dismissSuccess = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setScanSuccess(null);
    handledRef.current = false;
  }, []);

  const showScanSuccess = useCallback((result) => {
    setScanSuccess(result);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      dismissSuccess();
    }, 2600);
  }, [dismissSuccess]);

  const startScanner = useCallback(async (deviceId) => {
    const session = ++sessionRef.current;

    setCameraError(null);
    setPhase("opening");
    setPermissionPending(true);
    handledRef.current = false;
    setScanError(null);
    setProcessing(false);

    await releaseActiveScanner();
    await stopLocalScanner();

    if (session !== sessionRef.current || !mountedRef.current) {
      setPermissionPending(false);
      return;
    }

    clearRegionElement(regionId);

    const scanner = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = scanner;
    activeScannerInstance = scanner;

    try {
      await withTimeout(
        scanner.start(
          cameraConfig(deviceId),
          {
            fps: 10,
            aspectRatio: 1,
            qrbox: (viewWidth, viewHeight) => {
              const size = Math.min(260, Math.floor(Math.min(viewWidth, viewHeight) * 0.85));
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            if (handledRef.current || session !== sessionRef.current || scanSuccessRef.current) return;
            handledRef.current = true;
            setProcessing(true);
            setScanError(null);
            Promise.resolve(onScanRef.current(decodedText))
              .then((result) => {
                if (session !== sessionRef.current) return;
                setProcessing(false);
                if (!result) {
                  handledRef.current = false;
                  return;
                }
                showScanSuccess({
                  serial: result?.serial,
                  eventName: result?.eventName ?? eventName,
                });
              })
              .catch((err) => {
                if (session === sessionRef.current) {
                  handledRef.current = false;
                  setProcessing(false);
                  setScanError(err instanceof Error ? err.message : "Scan failed");
                }
              });
          },
          () => {}
        ),
        START_TIMEOUT_MS,
        "Camera took too long to open. Close the scanner and try again."
      );

      if (session !== sessionRef.current || !mountedRef.current) {
        await stopLocalScanner();
        return;
      }

      setPhase("scanning");
    } catch (err) {
      if (session === sessionRef.current && mountedRef.current) {
        setCameraError(formatCameraError(err));
        setPhase("error");
      }
      await stopLocalScanner();
    } finally {
      if (session === sessionRef.current && mountedRef.current) {
        setPermissionPending(false);
      }
    }
  }, [eventName, regionId, showScanSuccess, stopLocalScanner]);

  const allowCamera = useCallback(async () => {
    await startScanner(null);
  }, [startScanner]);

  useLayoutEffect(() => {
    if (!autoStart) return undefined;
    allowCamera();
    return () => {
      sessionRef.current += 1;
    };
  }, [autoStart, allowCamera]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      sessionRef.current += 1;
      stopLocalScanner();
    };
  }, [stopLocalScanner]);

  const showManualPrompt = phase === "permission" && !cameraError && !autoStart;
  const showOpening = (phase === "opening" || permissionPending) && !cameraError;
  const showScanner = phase === "scanning" && !cameraError;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <p className="text-sm text-text">Point at the fan&apos;s ticket QR</p>
        <Button variant="ghost" onClick={() => stopAndClose()}>
          Close
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 relative">
        {showManualPrompt ? (
          <div className="flex flex-col items-center gap-4 max-w-sm text-center">
            <p className="text-sm text-text leading-relaxed">
              Camera access is required to scan ticket QR codes. Tap below — your browser will
              ask for permission.
            </p>
            <Button
              onClick={() => allowCamera()}
              loading={permissionPending}
              loadingLabel="Opening camera…"
              className="text-base px-8 py-3"
            >
              Allow camera
            </Button>
          </div>
        ) : null}

        {cameraError ? (
          <div className="flex flex-col items-center gap-4 max-w-sm text-center">
            <p className="text-sm text-error leading-relaxed">{cameraError}</p>
            <Button
              onClick={() => allowCamera()}
              loading={permissionPending}
              loadingLabel="Opening camera…"
              className="text-base px-8 py-3"
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm">
            <div
              id={regionId}
              className={`gate-qr-scanner w-full overflow-hidden rounded-lg border border-white/20 min-h-[280px] ${
                showScanner ? "border-white/20" : "border-transparent"
              }`}
            />

            {showOpening && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/85 px-6 text-center">
                <p className="text-sm text-text leading-relaxed">
                  {autoStart
                    ? "Starting camera…"
                    : "Allow camera access in your browser when prompted."}
                </p>
                <p className="text-xs text-muted">Opening camera…</p>
              </div>
            )}

            {showScanner && !processing && !scanStatus && (
              <p className="text-xs text-muted text-center max-w-xs mt-2 mx-auto">
                Hold steady until the ticket is recognized.
              </p>
            )}

            {(processing || scanStatus) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-black/90 px-6 text-center">
                <div className="h-10 w-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                <p className="text-base font-medium text-text leading-relaxed">
                  {scanStatus ?? "Processing ticket…"}
                </p>
                {scanStatus?.includes("World ID") && (
                  <p className="text-xs text-muted max-w-xs leading-relaxed">
                    Ask the fan to open their ticket pass on their phone and tap Verify World ID.
                  </p>
                )}
                {waitingForHolder && onCancelVerification && (
                  <Button
                    variant="secondary"
                    onClick={() => onCancelVerification()}
                    loading={cancelLoading}
                    loadingLabel="Cancelling…"
                    className="mt-2"
                  >
                    Cancel verification
                  </Button>
                )}
              </div>
            )}

            {scanError && (
              <div className="absolute inset-x-0 bottom-0 mx-4 mb-4 rounded-lg border border-error/40 bg-black/95 px-4 py-3 text-center">
                <p className="text-sm text-error leading-relaxed">{scanError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setScanError(null);
                    handledRef.current = false;
                  }}
                  className="mt-2 text-xs text-accent hover:text-accent-dim"
                >
                  Scan again
                </button>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {scanSuccess?.serial != null && (
            <TicketCheckedInOverlay
              serial={scanSuccess.serial}
              eventName={scanSuccess.eventName}
              variant="organizer"
              onDone={dismissSuccess}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
