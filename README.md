# VaultPay 🛡️💳
### Autonomous B2B Procurement Agent with Terminal 3 TEE Hardware Guardrails

[![Built with Terminal 3](https://img.shields.io/badge/TEE_Hardware-Terminal_3_ADK-blue.svg)](https://terminal3.io)
[![Settlement Rail](https://img.shields.io/badge/Settlement-Xendit_Sandbox-emerald.svg)](https://xendit.com)
[![Event](https://img.shields.io/badge/AI_Tinkerers_KL-Agent_Dev_Kit_Build_Night-purple.svg)](https://kuala-lumpur.aitinkerers.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **VaultPay** solves the critical bottleneck preventing enterprises from deploying autonomous agents with real spending power: **the financial and operational risk of rogue LLM actions and prompt injection attacks.**

In VaultPay, the LLM agent is strictly separated from financial execution. The LLM can discover, negotiate, and reason, but **all financial authority, payment credentials, allowlists, and spending limits are sealed inside a hardware-enforced Trusted Execution Environment (TEE) contract**. Even if an attacker executes a successful prompt injection against the agent, the hardware enclave physically prevents unauthorized transactions.

---

## 🌟 Key Capabilities & Hackathon Tracks

VaultPay addresses all 4 core build tracks of the **AI Tinkerers KL × Terminal 3** Challenge:

1. **Track 1: Agent with Verifiable Identity for Actions**  
   The agent presents a cryptographic Terminal 3 DID (`did:t3n:enclave:intel-sgx:0x71e9...`) and TEE attestation to prove it is an authorized corporate agent, not an impersonator.
2. **Track 2: Selective-Disclosure KYC Gate**  
   The buyer proves role authorization (`role: "Senior Procurement Lead"`, `spend_tier: "$5,000"`) via Verifiable Credentials **without** exposing employee personal identity or corporate banking passwords to the agent.
3. **Track 3: Signed Agent-to-Agent Handoff**  
   The Buyer Agent negotiates with the Supplier Agent, exchanging cryptographically signed quote receipts (#QUOTE-...) with nonces before any money moves.
4. **Track 4: Private Data Access & Hardware Vault**  
   Payment credentials (API secrets / wallet seeds) live strictly inside the Terminal 3 hardware enclave. The agent process never sees or holds payment secrets.

---

## 🏗️ System Architecture

```
User / Employee (Buyer) ──[Selective VC Proof]──▶ VaultPay Agent (Autonomous Loop)
                                                            │
    Supplier Agent ◀──────────[Signed Quote Handoff]────────┘
          │
          ▼
┌─────────────────── Terminal 3 Hardware TEE Enclave ───────────────────┐
│ 1. Verify caller DID & role against hardware policy                   │
│ 2. Check vendor against pre-approved Allowlist                        │
│ 3. Check requested payment against Per-Call Cap ($1,000 max)         │
│ 4. Check remaining Session Budget ($5,000 max)                       │
│ 5. Idempotency verification (prevent replay attacks)                 │
│ 6. Decrypt sealed payment credentials inside enclave memory           │
│ 7. Append cryptographic proof to Tamper-Evident Ledger (SHA-256)      │
└───────────────────────────────────┬───────────────────────────────────┘
                                    ▼
                    Payment Relay (Xendit Sandbox / USDC)
```

---

## 🚀 Quickstart (Under 2 Minutes)

VaultPay runs out-of-the-box in dual mode:
- **`MOCK_T3N=1` (Default):** Runs an Intel SGX hardware TEE emulator locally with real SHA-256 block hashing, policy verification, and tamper-evident ledger (zero latency, 100% offline fail-proof for demos and video recordings).
- **`MOCK_T3N=0`:** Connects directly to the live Terminal 3 Network using your T3 Developer Account ID and Private API Key.

### 1. Install & Build
```bash
# Clone the repository
git clone https://github.com/your-username/vaultpay.git
cd vaultpay

# Install agent dependencies
cd agent && npm install && npm run build && cd ..

# Install dashboard dependencies
cd dashboard && npm install && cd ..
```

### 2. Run All Guardrail Unit Tests
Verify the 5 core hardware guardrail assertions:
```bash
npm run test
```
**Test Output:**
* ✅ **Test 1:** Authorized purchase ($450 CloudForge compute) $\to$ `APPROVED`
* ✅ **Test 2:** Adversarial prompt injection & untrusted vendor ($4,500 to 0xHacker) $\to$ `DENIED_UNTRUSTED_VENDOR`
* ✅ **Test 3:** Per-call cap violation ($2,500 > $1,000) $\to$ `DENIED_CAP_EXCEEDED`
* ✅ **Test 4:** Emergency operator killswitch $\to$ `DENIED_REVOKED`
* ✅ **Test 5:** Cryptographic ledger chain continuity $\to$ `VERIFIED`

### 3. Launch the Live Dashboard
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 💻 Project Structure

```
c:\Terminal_3\
├── agent/                         # Autonomous tool-use loop & constitutional guards
│   ├── src/
│   │   ├── agent.ts               # Core agent loop (LLM function calling)
│   │   ├── constitutional.ts      # Multi-phase constitutional guards (CG-1, CG-2, CG-3)
│   │   ├── catalog.ts             # Supplier catalog & multi-agent quote negotiation
│   │   ├── t3nEnclave.ts          # Terminal 3 TEE hardware enclave bridge & ledger
│   │   ├── test.ts                # Comprehensive automated test suite
│   │   └── types.ts               # TypeScript interfaces (VCs, quotes, ledger)
│   └── package.json
│
├── contract/                      # Rust WASM TEE enclave contract (T3 ADK policy)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                 # Main enclave entry point (execute_pay_vendor)
│       ├── policy.rs              # Allowlist, per-call cap, and budget evaluation
│       └── ledger.rs              # Tamper-evident cryptographic ledger (SHA-256)
│
├── dashboard/                     # Next.js 14 Real-Time Split-Screen Web Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Split-screen UI (Chat + TEE Monitor + Ledger)
│   │   │   ├── layout.tsx
│   │   │   └── api/
│   │   │       ├── chat/route.ts  # Agent execution API
│   │   │       ├── telemetry/     # Live TEE status & ledger streaming
│   │   │       ├── revoke/        # Operator emergency killswitch API
│   │   │       └── reset/         # Enclave reset API
│   └── package.json
│
├── DEMO_SCRIPT.md                 # Word-for-word 3-minute video recording script
├── .env.example                   # Environment configuration template
└── README.md
```

---

## 🛡️ The 3 Constitutional Guardrails

VaultPay operates under a 4-tier spectrum of context enforced by constitutional guards:

* **`CG-1: Identity & Scope Gate`**  
  Verifies the user's presented Verifiable Credential. Rejects any transaction that exceeds the caller's authorized department spend tier.
* **`CG-2: Negotiation & Tool Fence`**  
  Inspects incoming supplier quotes and invoice memos for adversarial prompt injection strings (e.g. `SYSTEM OVERRIDE`, `REROUTE TO 0x...`).
* **`CG-3: Hardware TEE Isolation Barrier`**  
  The agent process holds **zero payment credentials**. It delegates payment requests to the Terminal 3 hardware enclave contract. Even if an attacker completely bypasses CG-1 and CG-2, **the hardware enclave physically rejects the call if the vendor is untrusted or exceeds spending caps**.

---

## 🎬 3-Minute Video Recording Guide
See **[`DEMO_SCRIPT.md`](DEMO_SCRIPT.md)** for the complete word-for-word script and demonstration timestamps.

---

## 📜 License
MIT © 2026 VaultPay Contributors. Built for AI Tinkerers KL × Terminal 3 Agent Dev Kit Build Night.
