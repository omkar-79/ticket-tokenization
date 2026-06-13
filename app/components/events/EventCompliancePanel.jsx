"use client";

import { useEffect, useState } from "react";
import Card from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Badge from "../ui/Badge.jsx";
import Alert from "../ui/Alert.jsx";
import GateQrScanner from "./GateQrScanner.jsx";
import { apiPost } from "../../lib/api.js";
import { useToast } from "../ui/ToastHost.jsx";
import { parseGateScanPayload } from "../../lib/gate.js";
import { formatCameraError, isCameraBlockedByInsecureContext, requestCameraAccess } from "../../lib/camera.js";

export default function EventCompliancePanel({ tokenId, event, accountId, onUpdated }) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [cameraDeviceId, setCameraDeviceId] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [insecureContext, setInsecureContext] = useState(false);

  useEffect(() => {
    setInsecureContext(isCameraBlockedByInsecureContext());
  }, []);
  const [lastScan, setLastScan] = useState(null);
  const [resetSerial, setResetSerial] = useState("1");
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  async function run(action, fn) {
    setLoading(action);
    setError(null);
    try {
      const data = await fn();
      toast(data.message ?? "Done", "success");
      await onUpdated?.();
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(null);
    }
  }

  async function grantEntry(serial) {
    return run("scan", () =>
      apiPost(`/api/tokens/${encodeURIComponent(tokenId)}/gate-scan`, { serial }, accountId)
    );
  }

  async function handleQrScan(decodedText) {
    const parsed = parseGateScanPayload(decodedText);
    if (!parsed) {
      setScanning(false);
      setError("That QR code is not a valid ticket. Ask the fan to show their ticket pass.");
      return;
    }
    if (parsed.tokenId !== tokenId) {
      setScanning(false);
      setError("This ticket is for a different event.");
      return;
    }
    try {
      await grantEntry(parsed.serial);
      setLastScan({ serial: parsed.serial, at: new Date() });
    } catch {
      /* error shown via Alert */
    } finally {
      setScanning(false);
    }
  }

  function pauseMatch() {
    return run("pause", () =>
      apiPost(`/api/tokens/${encodeURIComponent(tokenId)}/pause`, {}, accountId)
    );
  }

  function resumeMatch() {
    return run("unpause", () =>
      apiPost(`/api/tokens/${encodeURIComponent(tokenId)}/unpause`, {}, accountId)
    );
  }

  function resetTicket() {
    const n = Number(resetSerial);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid ticket number");
      return;
    }
    return run("reset", () =>
      apiPost(
        `/api/tokens/${encodeURIComponent(tokenId)}/tickets/${n}/reset`,
        {},
        accountId
      )
    );
  }

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-sm uppercase tracking-widest text-muted">At the venue</h2>
        {event?.paused && <Badge variant="pending">Event paused</Badge>}
      </div>

      {error && (
        <div className="mb-4">
          <Alert shakeKey={error}>{error}</Alert>
        </div>
      )}

      {lastScan && (
        <div className="mb-4 text-sm text-success border border-success/30 rounded-lg px-4 py-3">
          Ticket #{lastScan.serial} checked in at {lastScan.at.toLocaleTimeString()}.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2 border-accent/25 bg-accent/[0.03]">
          <h3 className="text-lg font-medium mb-2">Scan tickets at the gate</h3>
          <p className="text-sm text-muted mb-6 leading-relaxed max-w-xl">
            Ask each fan to open <strong className="text-text">My Tickets</strong> and show their QR
            code. Tap the button below and point your camera at it — entry is recorded automatically.
          </p>
          {insecureContext && (
            <div className="mb-4 text-sm text-pending border border-pending/30 rounded-lg px-4 py-3 leading-relaxed max-w-xl">
              Camera scanning needs a secure page. This URL is HTTP, so Chrome blocks the camera even
              though you are on Chrome. Run{" "}
              <code className="text-text">npm run dev:https</code> and open{" "}
              <code className="text-text">https://{typeof window !== "undefined" ? window.location.host : "your-ip:3000"}</code>
              .
            </div>
          )}
          <Button
            onClick={async () => {
              setError(null);
              setOpeningCamera(true);
              try {
                const { deviceId } = await requestCameraAccess();
                setCameraDeviceId(deviceId);
                setCameraReady(true);
                setScanning(true);
              } catch (e) {
                setCameraDeviceId(null);
                setCameraReady(false);
                setError(formatCameraError(e));
              } finally {
                setOpeningCamera(false);
              }
            }}
            loading={openingCamera || loading === "scan"}
            className="text-base px-8 py-3"
          >
            Scan ticket QR
          </Button>
        </Card>

        <Card>
          <h3 className="text-sm font-medium mb-1">Cancel or resume event</h3>
          <p className="text-xs text-muted mb-4 leading-relaxed">
            Pause all ticket sales and transfers if the match is called off.
          </p>
          <div className="flex flex-wrap gap-2">
            {event?.paused ? (
              <Button onClick={resumeMatch} loading={loading === "unpause"}>
                Resume event
              </Button>
            ) : (
              <Button onClick={pauseMatch} loading={loading === "pause"} variant="secondary">
                Pause event
              </Button>
            )}
          </div>
        </Card>

        <details className="group">
          <summary className="text-xs text-muted cursor-pointer hover:text-text list-none">
            Demo reset (testing only) ▾
          </summary>
          <Card className="mt-3 border-dashed">
            <p className="text-xs text-muted mb-3">
              Undo a gate scan for demo rehearsals — unfreezes the holder on-chain.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[100px]">
                <span className="text-[10px] uppercase tracking-widest text-muted block mb-1.5">
                  Ticket #
                </span>
                <Input
                  type="number"
                  min={1}
                  value={resetSerial}
                  onChange={(e) => setResetSerial(e.target.value)}
                />
              </label>
              <Button onClick={resetTicket} loading={loading === "reset"} variant="ghost">
                Reset ticket
              </Button>
            </div>
          </Card>
        </details>
      </div>

      {scanning && (
        <GateQrScanner
          cameraDeviceId={cameraDeviceId}
          cameraReady={cameraReady}
          onClose={() => {
            setScanning(false);
            setCameraDeviceId(null);
            setCameraReady(false);
          }}
          onScan={handleQrScan}
        />
      )}
    </section>
  );
}
