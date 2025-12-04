import https from "https";
import fs from "fs";
import tls from "tls";
import path from "path";

// Paths to cert files
const CERT_PATHS = {
  key: path.join(process.cwd(), "server.key"),
  cert: path.join(process.cwd(), "server.crt"),
  ca: path.join(process.cwd(), "ca.crt"),
};

// Function to load certificate files
function loadCertificates() {
  return {
    key: fs.readFileSync(CERT_PATHS.key),
    cert: fs.readFileSync(CERT_PATHS.cert),
    ca: fs.readFileSync(CERT_PATHS.ca),
    requestCert: true,       // Require client certificate
    rejectUnauthorized: true // Reject if certificate not trusted
  };
}

let tlsOptions = loadCertificates();
let secureContext = tls.createSecureContext(tlsOptions);

const server = https.createServer(
  {
    ...tlsOptions,
    SNICallback: () => secureContext,
  },
  (req, res) => {
    res.writeHead(200);
    res.end("mTLS server is running. Client certificate validated.\n");
  }
);

server.listen(8443, () => {
  console.log("🔥 mTLS server running on https://localhost:8443");
  console.log("🔐 Client certificate is required.");
  console.log("♻ Watching certificate files for live reload...");
});

// Watch for certificate updates and hot-reload TLS
Object.values(CERT_PATHS).forEach((filePath) => {
  fs.watchFile(filePath, () => {
    console.log(`♻ Certificate updated: ${path.basename(filePath)}`);
    try {
      tlsOptions = loadCertificates();
      secureContext = tls.createSecureContext(tlsOptions);
      console.log("🔄 TLS context reloaded without restarting server");
    } catch (err) {
      console.error("❌ Error while reloading TLS context:", err.message);
    }
  });
});