export function isCameraBlockedByInsecureContext() {
  return typeof window !== "undefined" && !window.isSecureContext;
}

function insecureContextMessage() {
  const host =
    typeof window !== "undefined" ? window.location.host : "this address";
  return (
    `Camera is blocked on http://${host} — Chrome only allows the camera on HTTPS or localhost, not plain HTTP over a network IP. ` +
    `Run npm run dev:https and open https://${host}, or use localhost on this computer.`
  );
}

/** Request camera access (triggers the browser permission prompt on user gesture). */
export async function requestCameraAccess() {
  if (isCameraBlockedByInsecureContext()) {
    const err = new Error(insecureContextMessage());
    err.name = "InsecureContextError";
    throw err;
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    const err = new Error(
      "Your browser does not expose the camera API. Update Chrome or try another browser."
    );
    err.name = "NotSupportedError";
    throw err;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
  });

  const track = stream.getVideoTracks()[0];
  const deviceId = track?.getSettings()?.deviceId ?? null;

  for (const t of stream.getTracks()) {
    t.stop();
  }

  return { deviceId };
}

export function formatCameraError(err) {
  const name = err?.name ?? "";

  if (name === "InsecureContextError") {
    return err.message;
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access was blocked. Tap Allow camera and choose Allow in the browser popup, or enable Camera for this site in your browser settings.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Camera is in use by another app. Close it and try again.";
  }
  if (name === "NotSupportedError") {
    return err.message;
  }

  return err?.message ?? "Could not open camera — allow camera access and try again.";
}
