/**
 * Creates a self-signed TLS certificate for local HTTPS development.
 * Output: backend/certs/localhost-key.pem and localhost-cert.pem (git-ignored).
 *
 * Usage:  node scripts/generate-dev-cert.js
 * Then add to backend/.env:
 *   HTTPS_KEY_FILE=certs/localhost-key.pem
 *   HTTPS_CERT_FILE=certs/localhost-cert.pem
 *
 * Requires OpenSSL (included with Git for Windows).
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const candidates = [
  process.env.OPENSSL_PATH,
  "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
  "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe",
  "openssl"
].filter(Boolean);

const openssl = candidates.find((p) => p === "openssl" || fs.existsSync(p));
const dir = path.join(__dirname, "..", "certs");
fs.mkdirSync(dir, { recursive: true });

const keyFile = path.join(dir, "localhost-key.pem");
const certFile = path.join(dir, "localhost-cert.pem");

execFileSync(openssl, [
  "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "365",
  "-keyout", keyFile, "-out", certFile,
  "-subj", "/CN=localhost",
  "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"
], { stdio: "ignore" });

console.log("Created certs/localhost-key.pem and certs/localhost-cert.pem");
console.log("Add HTTPS_KEY_FILE and HTTPS_CERT_FILE to .env, restart the backend,");
console.log("then open https://localhost:5000/api/health once and accept the certificate warning.");
