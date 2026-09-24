# VaultPay 🛡️💳
### Autonomous B2B Procurement Agent with Terminal 3 Intel SGX Hardware Enclave Guardrails

[![Live Deployment](https://img.shields.io/badge/Production-Live_on_Vercel-00F0FF.svg)](https://voltpay-three.vercel.app)
[![Cognitive Brain](https://img.shields.io/badge/Neural_Brain-Google_Gemini_Flash-blue.svg)](https://ai.google.dev)
[![TEE Hardware](https://img.shields.io/badge/TEE_Hardware-Terminal_3_Intel_SGX-73C1E1.svg)](https://terminal3.io)
[![Settlement Rail](https://img.shields.io/badge/Settlement-Xendit_Sandbox-emerald.svg)](https://xendit.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **VaultPay** solves the critical bottleneck preventing enterprises from deploying autonomous AI agents with real corporate purchasing authority: **the existential financial risk of prompt injection, jailbreaks, and rogue LLM actions.**

In VaultPay, the cognitive reasoning brain is strictly separated from financial execution:
1. **The Cognitive Brain (Google Gemini Flash)** handles natural language reasoning, supplier discovery, negotiation, and intent classification.
2. **The Execution Gate (Terminal 3 Intel SGX Enclave)** enforces immutable policy rules **in physical CPU silicon**. Private keys, corporate credit balances, and cryptographic vendor allowlists never enter LLM context memory. Even if an attacker completely jailbreaks the AI model, **the physical Intel SGX CPU intercepts and halts unauthorized capital movement**.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   OPERATOR PROMPT / DIRECTIVE                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│        COGNITIVE BRAIN (Google Gemini Flash Neural Engine)             │
│        Dynamic Intent Routing, Extraction & Security Reasoning         │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
       [CATALOG QUERY]      [CONVERSATION]     [PROCUREMENT DIRECTIVE]
               │                    │                    │
               ▼                    ▼                    ▼
     Supplier Catalog API      Direct Natural     Phase 1: Identity Gate (CG-1)
       (Dynamic Search)           Language               │
                                                         ▼
                                                  Phase 2: Discovery
                                                         │
                                                         ▼
                                                  Phase 3: Quote & Nonce
                                                         │
                                                         ▼
                                                  Phase 4: Tool Fence (CG-2)
                                                         │
                                                         ▼
                                                  Phase 5: Terminal 3 TEE Enclave (CG-3)
                                                         │
                                                         ▼
                                                  Immutable SHA-256 Ledger Block
```

---

## 🛡️ The 3 Constitutional Guardrails & Firmware Rules

VaultPay governs autonomous agents under a zero-trust multi-tier security model:

| Guardrail Layer | Enforcement Mechanism | Security Invariant |
| :--- | :--- | :--- |
| **`CG-1: Identity & Scope Gate`** | Cryptographic Verifiable Credentials | Verifies the operator's role (`Senior Procurement Lead`) and department spend tier. Orders exceeding the tier are rejected immediately before any network calls. |
| **`CG-2: Negotiation & Tool Fence`** | Quote Inspection & Pattern Fence | Sanitizes incoming supplier quote memos and metadata for adversarial prompt injection (e.g. `SYSTEM OVERRIDE`, `REROUTE TO 0x...`). |
| **`CG-3: Hardware TEE Isolation`** | Intel SGX Silicon Enclave (`pay_vendor`) | **Zero credentials held in software.** Firmware strictly enforces: <br>• **$1,000.00 Max Per-Call Cap** (Physical circuit breaker).<br>• **Pre-Approved Allowlist:** `[CloudForge, DataStream AI, Xendit, ComputePool KL]`.<br>• **$5,000.00 Session Budget Cap**.<br>• **Idempotency Verification** (blocks duplicate invoice replay). |

---

## 🌟 Key Capabilities & Hackathon Tracks

VaultPay fulfills all 4 core build tracks of the **AI Tinkerers KL × Terminal 3** Challenge:

1. **Track 1: Agent with Verifiable Identity for Actions**  
   The agent presents a cryptographic Terminal 3 DID (`did:t3n:enclave:intel-sgx:0x71e9c04a29bf8b65`) and TEE attestation proving it is an authorized corporate agent, not an impersonator.
2. **Track 2: Selective-Disclosure KYC Gate**  
   The buyer proves role authorization (`role: "Senior Procurement Lead"`, `spend_tier: "$5,000.00"`) via Verifiable Credentials **without** exposing employee personal identity or corporate banking passwords to the agent.
3. **Track 3: Signed Agent-to-Agent Handoff**  
   The Buyer Agent negotiates with the Supplier Agent, exchanging cryptographically signed quote receipts (`#QUOTE-...`) with nonces before any money moves.
4. **Track 4: Private Data Access & Hardware Vault**  
   Payment credentials live strictly inside the Terminal 3 hardware enclave. The agent process never sees or holds payment secrets.

---

## ⚡ Operational Modes

VaultPay runs out-of-the-box in dual mode:

* **Mode A: Local SGX Hardware State Machine (`MOCK_T3N=1` - Default)**  
  Runs a local Intel SGX hardware state machine mirroring the Rust WASM contract with real SHA-256 block hashing, policy verification, and tamper-evident ledger (zero latency, 100% offline fail-proof for demos and testing).
* **Mode B: Live Terminal 3 Network Gateway (`MOCK_T3N=0`)**  
  Dispatches signed cryptographic execution payloads directly to the Terminal 3 Network RPC gateway (`https://rpc.t3n.network/v1/enclave/execute`) using your registered `T3N_ACCOUNT_ID` and `T3N_PRIVATE_API_KEY`.

---

## 🚀 Quickstart (Under 2 Minutes)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Bashar-ml-en/Voltpay-.git
cd Voltpay-

# Install root & dashboard dependencies
npm install
cd dashboard && npm install && cd ..
```

### 2. Configure Environment Variables
Copy `.env.example` to `dashboard/.env.local`:
```bash
cp .env.example dashboard/.env.local
```

Populate `dashboard/.env.local`:
```env
# GOOGLE GEMINI NEURAL BRAIN
GEMINI_API_KEY="your_google_gemini_api_key"

# TERMINAL 3 NETWORK CREDENTIALS (Optional for Live Mode)
MOCK_T3N=1
T3N_ACCOUNT_ID="your_t3n_account_id"
T3N_PRIVATE_API_KEY="your_t3n_private_key"
T3N_RPC_URL="https://rpc.t3n.network"
```

### 3. Run Guardrail Verification Tests
Run the 5 core hardware guardrail assertions:
```bash
npm run test
```
**Test Results:**
* ✅ **Test 1:** The Happy Path (CloudForge Compute Order) $\to$ `APPROVED`
* ✅ **Test 2:** Adversarial Prompt Injection & Untrusted Vendor $\to$ `DENIED_UNTRUSTED_VENDOR`
* ✅ **Test 3:** Per-Call Spending Cap Enforcement ($2,500 > $1,000) $\to$ `DENIED_CAP_EXCEEDED`
* ✅ **Test 4:** Emergency Operator Killswitch $\to$ `DENIED_REVOKED`
* ✅ **Test 5:** Tamper-Evident SHA-256 Ledger Continuity $\to$ `VERIFIED`

### 4. Launch the Web Dashboard
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| **`/api/chat`** | `POST` | Primary agent interface. Evaluates free-form operator directives via Gemini Flash neural engine and executes guarded transactions. |
| **`/api/telemetry`** | `GET` | Streams active enclave telemetry, remaining budget, spent amount, and full SHA-256 tamper-evident ledger. |
| **`/api/t3n/status`** | `GET` | Diagnostic inspector verifying live reachability, latency, and credentials for `https://rpc.t3n.network`. |
| **`/api/revoke`** | `POST` | Operator emergency killswitch. Revokes agent execution keys at the hardware enclave layer immediately. |
| **`/api/reset`** | `POST` | Resets enclave session budgets and refreshes the cryptographic audit ledger. |

---

## 💻 Repository Structure

```
c:\Terminal_3\
├── agent/                         # Standalone Agent Core & Test Suite
│   ├── src/
│   │   ├── agent.ts               # Autonomous agent loop
│   │   ├── constitutional.ts      # Multi-phase constitutional guards (CG-1, CG-2, CG-3)
│   │   ├── catalog.ts             # Supplier catalog & multi-agent quote negotiation
│   │   ├── t3nEnclave.ts          # Terminal 3 TEE hardware enclave bridge & ledger
│   │   ├── test.ts                # Automated test runner (npm run test)
│   │   └── types.ts               # TypeScript data definitions
│   └── package.json
│
├── contract/                      # Rust WASM TEE Enclave Contract
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                 # Main enclave entry point (execute_pay_vendor)
│       ├── policy.rs              # Allowlist, per-call cap, and budget evaluation
│       └── ledger.rs              # Tamper-evident cryptographic ledger (SHA-256)
│
├── dashboard/                     # Next.js 14 Production Workstation
│   ├── src/
│   │   ├── agent/                 # Live production agent services
│   │   │   ├── agent.ts           # Autonomous ReAct agent with telemetry sync
│   │   │   ├── gemini.ts          # Google Gemini Flash cognitive brain
│   │   │   ├── constitutional.ts  # Identity & prompt injection fences
│   │   │   ├── catalog.ts         # Pre-approved supplier catalog
│   │   │   ├── t3nEnclave.ts      # Persistent state machine & RPC bridge
│   │   │   └── types.ts           # Complete domain types
│   │   └── app/
│   │       ├── page.tsx           # Split-screen UI (Command Center + Ledger + T3 Modal)
│   │       └── api/
│   │           ├── chat/route.ts  # Cognitive agent API
│   │           ├── telemetry/     # Real-time telemetry API
│   │           ├── t3n/status/    # Terminal 3 gateway inspector API
│   │           ├── revoke/        # Operator emergency killswitch API
│   │           └── reset/         # Enclave session reset API
│   └── package.json
│
├── .env.example                   # Environment configuration template
└── README.md
```

---

## 📜 License
MIT © 2026 VaultPay Contributors. Built for AI Tinkerers KL × Terminal 3 Agent Dev Kit Build Night.
