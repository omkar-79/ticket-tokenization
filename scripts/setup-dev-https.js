import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const dir = path.join(process.cwd(), "certificates");
const keyPath = path.join(dir, "dev-key.pem");
const certPath = path.join(dir, "dev-cert.pem");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log("HTTPS dev certs already exist in certificates/");
  process.exit(0);
}

fs.mkdirSync(dir, { recursive: true });

const ips = new Set(["127.0.0.1"]);
for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces ?? []) {
    if (iface.family === "IPv4" && !iface.internal) {
      ips.add(iface.address);
    }
  }
}

const san = ["DNS:localhost", ...[...ips].map((ip) => `IP:${ip}`)].join(",");

execSync(
  `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=${san}"`,
  { stdio: "inherit" }
);

console.log(`Created dev HTTPS cert with: ${san}`);
