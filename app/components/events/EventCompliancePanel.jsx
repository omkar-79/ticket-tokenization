"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Card from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";
import Badge from "../ui/Badge.jsx";
import Alert from "../ui/Alert.jsx";
import GateQrScanner from "./GateQrScanner.jsx";
import { apiGet, apiPost } from "../../lib/api.js";
import { useToast } from "../ui/ToastHost.jsx";
import { parseGateScanPayload } from "../../lib/gate.js";
import { isCameraBlockedByInsecureContext } from "../../lib/camera.js";

export default function EventCompliancePanel({ tokenId, event, accountId, onUpdated }) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanSession, setScanSession] = useState(0);
  const [insecureContext, setInsecureContext] = useState(false);

  useEffect(() => {
    setInsecureContext(isCameraBlockedByInsecureContext());
  }, []);
  const [lastScan, setLastScan] = useState(null);
  const [resetSerial, setResetSerial] = useState("1");
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);
  const [activeChallengeId, setActiveChallengeId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const waitCancelledRef = useRef(false);

  async function cancelVerification() {
    if (!activeChallengeId || cancelLoading) return;
    setCancelLoading(true);
    waitCancelledRef.current = true;
    try {
      await apiPost(
        `/api/gate-challenges/${encodeURIComponent(activeChallengeId)}/cancel`,
        {},
        accountId
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setCancelLoading(false);
    }
  }

  async function waitForChallenge(challengeId) {
    waitCancelledRef.current = false;
    setActiveChallengeId(challengeId);
    const deadline = Date.now() + 180000;

    try {
      while (Date.now() < deadline) {
        if (waitCancelledRef.current) {
          return { cancelled: true };
        }

        await new Promise((r) => setTimeout(r, 2000));

        if (waitCancelledRef.current) {
          return { cancelled: true };
        }

        const status = await apiGet(
          `/api/gate-challenges/${encodeURIComponent(challengeId)}`,
          accountId
        );
        if (status.status === "confirmed") {
          return { confirmed: true, ...status };
        }
        if (status.status === "cancelled") {
          return waitCancelledRef.current
            ? { cancelled: true }
            : { cancelled: true, byHolder: false };
        }
        if (status.status === "expired") {
          throw new Error(
            "Holder did not confirm in time — ask them to open their ticket pass and try again"
          );
        }
      }
      throw new Error("Timed out waiting for holder to confirm with World ID");
    } finally {
      setActiveChallengeId(null);
    }
  }

  async function handleQrScan(decodedText) {
    const parsed = parseGateScanPayload(decodedText);
    if (!parsed) {
      setError("That QR code is not a valid ticket. Ask the fan to show their ticket pass.");
      throw new Error("Invalid QR");
    }
    if (parsed.tokenId !== tokenId) {
      setError("This ticket is for a different event.");
      throw new Error("Wrong event");
    }
    if (!parsed.pass) {
      setError("Outdated QR — ask the fan to refresh their ticket pass (resale invalidates old codes).");
      throw new Error("Legacy QR");
    }

    setLoading("scan");
    setScanStatus("Verifying signed pass & on-chain owner…");
    setError(null);
    try {
      const init = await apiPost(
        `/api/tokens/${encodeURIComponent(tokenId)}/gate-scan/initiate`,
        { pass: parsed.pass },
        accountId
      );

      setScanStatus("Waiting for holder to confirm with World ID on their phone…");
      const waitResult = await waitForChallenge(init.challengeId);

      if (waitResult.cancelled) {
        setScanStatus(null);
        return null;
      }

      setLastScan({ serial: parsed.serial, at: new Date() });
      await onUpdated?.();
      setScanStatus(null);
      setScanning(false);
      return {
        serial: parsed.serial,
        eventName: event?.name ?? null,
        message: init.message,
      };
    } catch (e) {
      setError(e.message);
      setScanStatus(null);
      throw e;
    } finally {
      setLoading(null);
    }
  }

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
        <div className="mb-4 text-sm text-success border border-success/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            ✓
          </span>
          <span>
            Access granted — ticket #{lastScan.serial} checked in at {lastScan.at.toLocaleTimeString()}.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2 border-accent/25 bg-accent/[0.03]">
          <h3 className="text-lg font-medium mb-2">Scan tickets at the gate</h3>
          <p className="text-sm text-muted mb-6 leading-relaxed max-w-xl">
            Ask each fan to open their <strong className="text-text">ticket pass</strong> (full-screen QR) and
            keep it open. After you scan, they must tap <strong className="text-text">Verify World ID</strong> on
            that pass page — entry is not instant.
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
            onClick={() => {
              setError(null);
              flushSync(() => {
                setScanSession((n) => n + 1);
                setScanning(true);
              });
            }}
            loading={loading === "scan"}
            disabled={insecureContext}
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
          key={scanSession}
          autoStart
          eventName={event?.name}
          scanStatus={scanStatus}
          onClose={async () => {
            waitCancelledRef.current = true;
            if (activeChallengeId) {
              try {
                await apiPost(
                  `/api/gate-challenges/${encodeURIComponent(activeChallengeId)}/cancel`,
                  {},
                  accountId
                );
              } catch {
                /* ignore — closing scanner still resets UI */
              }
            }
            setActiveChallengeId(null);
            setScanning(false);
            setScanStatus(null);
          }}
          waitingForHolder={Boolean(activeChallengeId && scanStatus?.includes("World ID"))}
          onCancelVerification={cancelVerification}
          cancelLoading={cancelLoading}
          onScan={handleQrScan}
        />
      )}
    </section>
  );
}
