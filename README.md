# mTLS-Server

mTLS-Server-with-Live-Cert-Reload This project demonstrates a secure Node.js HTTPS server that enforces Mutual TLS (mTLS) and supports reloading its TLS certificates without needing a server restart.

🚀 Prerequisites Make sure you have the following installed:

Node.js

npm (Node Package Manager)

OpenSSL (for generating certificates)

1️⃣ Project Setup Create the required file and folder structure:

node-ssl-server/ ├── cert/ │ ├── cert.pem # Server's Certificate (public) │ ├── key.pem # Server's Private Key (secret) │ ├── ca.crt # Certificate Authority (CA) Root Certificate │ ├── client-cert.pem # Client's Certificate (for testing) │ └── client-key.pem # Client's Private Key (for testing) ├── mtls-server.js └── package.json Create package.json: Use the file provided in the prompt.

Install Dependencies:

Bash

npm install

2️⃣ Generate Certificates (OpenSSL) We need a Certificate Authority (CA) to sign both the server and client certificates, enabling mutual trust. We will also generate a separate certificate/key for testing the client connection.

A. Generate CA Root Certificate The CA root certificate (ca.crt) is used to sign the server and client certificates.

Bash

Generate CA Private Key openssl genpkey -algorithm RSA -out cert/ca.key -pkeyopt rsa_keygen_bits:2048

Generate CA Root Certificate openssl req -x509 -new -nodes -key cert/ca.key -sha256 -days 1825 -out cert/ca.crt -subj "/CN=My-CA-Root" B. Generate Server Certificates The server's certificate (cert.pem) and private key (key.pem).

Bash

Generate Server Private Key openssl genpkey -algorithm RSA -out cert/key.pem -pkeyopt rsa_keygen_bits:2048

Generate Server Certificate Signing Request (CSR) openssl req -new -key cert/key.pem -out cert/server.csr -subj "/CN=localhost"

Sign the Server Certificate with the CA openssl x509 -req -in cert/server.csr -CA cert/ca.crt -CAkey cert/ca.key -CAcreateserial -out cert/cert.pem -days 825 -sha256 C. Generate Client Certificates (for testing) The client's certificate (client-cert.pem) and private key (client-key.pem).

Bash

Generate Client Private Key openssl genpkey -algorithm RSA -out cert/client-key.pem -pkeyopt rsa_keygen_bits:2048

Generate Client CSR openssl req -new -key cert/client-key.pem -out cert/client.csr -subj "/CN=Test-Client"

Sign the Client Certificate with the CA openssl x509 -req -in cert/client.csr -CA cert/ca.crt -CAkey cert/ca.key -CAcreateserial -out cert/client-cert.pem -days 825 -sha256

3️⃣ mtls-server.js Code This file implements:

mTLS requirement: Setting requestCert: true and rejectUnauthorized: true.

Certificate Reload: Watching the cert folder and calling server.setSecureContext() on file changes.

JavaScript

const express = require('express'); const https = require('https'); const fs = require('fs'); const path = require('path');

const app = express(); const PORT = 3000; const CERT_DIR = path.join(__dirname, 'cert');

// --- 1. Load Initial TLS Context --- function getTlsOptions() { console.log('🔄 Loading new TLS context...'); try { return { key: fs.readFileSync(path.join(CERT_DIR, 'key.pem')), cert: fs.readFileSync(path.join(CERT_DIR, 'cert.pem')), // 💡 mTLS Setup: Trust certificates signed by our CA. ca: fs.readFileSync(path.join(CERT_DIR, 'ca.crt')), // 💡 mTLS Requirement: Require a client certificate. requestCert: true, // 💡 mTLS Requirement: Reject if the client certificate is invalid or missing. rejectUnauthorized: true }; } catch (err) { console.error('❌ Failed to load certificate files:', err.message); // Return a default, potentially insecure, or previous context if failure return {}; } }

// --- 2. Create the HTTPS Server --- // The initial TLS context is loaded here. const sslServer = https.createServer(getTlsOptions(), app);

// Simple route app.use('/', (req, res) => { // Optionally check client details for logging const clientCN = req.socket.getPeerCertificate()?.subject?.CN; console.log(Connection from Client CN: ${clientCN || 'N/A'}); res.send(✅ Hello from Secure mTLS Server! Client CN: ${clientCN}); });

// --- 3. Implement Certificate Reload (Watching) --- // Watch the 'cert' directory for changes. fs.watch(CERT_DIR, (eventType, filename) => { if (['cert.pem', 'key.pem', 'ca.crt'].includes(filename)) { console.log(\n🚨 Certificate file change detected: ${filename}. Reloading context...); try { // Get the new TLS options const newOptions = getTlsOptions(); // Apply the new context to the running server without restart sslServer.setSecureContext(newOptions); console.log('✅ TLS context reloaded successfully.'); } catch (error) { console.error('❌ Failed to reload TLS context:', error.message); } } });

// --- 4. Start Server --- sslServer.listen(PORT, () => { console.log(\n🚀 Secure mTLS server running on https://localhost:${PORT}); console.log('⚠️ Warning: Accessing via browser requires importing or configuring a client certificate.'); });

4️⃣ Run the Server Start the application using the start script defined in your package.json:

Bash

npm start

OR use nodemon for auto-restart on code changes (not cert changes) npm run dev

5️⃣ Testing the mTLS Connection A. Successful Connection (mTLS required) Use curl and provide the client certificate/key signed by the trusted CA.

Bash

curl --cert cert/client-cert.pem --key cert/client-key.pem --cacert cert/ca.crt https://localhost:3000 Expected Output: ✅ Hello from Secure mTLS Server! Client CN: Test-Client

B. Failed Connection (No client certificate) Attempt to connect without providing a client certificate.

Bash

curl --cacert cert/ca.crt https://localhost:3000 Expected Output: The connection will be rejected by the server with an error like SSL routines:ssl3_get_client_certificate:no certificate returned because rejectUnauthorized is set to true.

C. Testing Certificate Reload While the server is running, replace one of the server certificate files (cert/cert.pem or cert/key.pem) with a new version. The console will log:

🚨 Certificate file change detected: cert.pem. Reloading context... 🔄 Loading new TLS context... ✅ TLS context reloaded successfully.
