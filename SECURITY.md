# Security Policy

## Supported Versions

VaultPay adheres to semantic versioning. The following versions are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

We take the security of VaultPay, its hardware enclave bridges, and the autonomous financial layer extremely seriously. If you discover a security vulnerability, please do **NOT** open a public issue.

Instead, please report vulnerabilities by contacting our security team directly:
- **Email:** `security@vaultpay.network` or `security@terminal3.io`
- **PGP Key:** Available upon request

### Please include the following details:
1. Description of the vulnerability and attack vector.
2. Steps to reproduce or proof-of-concept (PoC) script.
3. Affected components (`agent`, `dashboard`, `contract`, or `mcp`).
4. Potential impact (e.g. budget bypass, allowlist circumvention, replay attack).

### Our Commitment:
- We will acknowledge receipt of your vulnerability report within **24 hours**.
- We will provide a status update and preliminary mitigation assessment within **48 hours**.
- We maintain a responsible disclosure timeline of **90 days** before public disclosure.

---

## Cryptographic & Hardware Boundaries

- **Intel SGX Enclave:** The policies defined in `contract/src/lib.rs` and enforced in `t3nEnclave.ts` represent the root of trust.
- **Cognitive Model:** The Google Gemini Flash model is considered an untrusted component in terms of financial authorization. All operations proposed by the model must be validated and signed inside the enclave before funds move.
- **Model Context Protocol (MCP):** All MCP tool inputs are strictly validated against `zod` schemas before hitting the enclave service.
