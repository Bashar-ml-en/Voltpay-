# Terminal 3 (VaultPay) - Agentic Assessment & Upgrade Roadmap

This document summarizes the architectural evaluation of the VaultPay project and outlines the roadmap for upgrading from the current interactive state-machine simulation to an authentic autonomous LLM agent.

---

## 1. Executive Summary

| Category | Assessment | Details |
| :--- | :--- | :--- |
| **Current Classification** | **Interactive Simulation / State Machine** | Hardcoded decision trees and canned thoughts. Zero active LLM runtime calls. |
| **Build Status** | **100% Passing** | Next.js 14 compiles with 0 errors. All 5 guardrail unit tests in `agent/src/test.ts` pass. |
| **TEE Layer** | **Software Emulator (TypeScript)** | Node `crypto` SHA-256 implementation in `t3nEnclave.ts`. Rust contract in `contract/` is uncompiled. |
| **Target Architecture** | **Autonomous Tool-Calling Agent** | Integrate Gemini 2.0 Flash function calling to replace deterministic heuristics. |

---

## 2. Key Gaps Identified

1. **Deterministic Branching vs. Genuine Reasoning**:
   - `agent.ts` uses static string checking (`userPrompt.toLowerCase().includes("datastream")`) instead of natural language understanding.
2. **Missing LLM Dependency**:
   - Neither `agent/package.json` nor `dashboard/package.json` includes an LLM SDK (`@google/genai` or `@google/generative-ai`).
3. **In-Memory State Loss**:
   - The enclave ledger and session budgets reset upon Next.js server restart.
4. **Disconnected Rust Contract**:
   - `contract/src/lib.rs` is present but not bound to the Node runtime via WebAssembly.

---

## 3. Recommended Upgrade Path (Kept within `C:\Terminal_3`)

1. **Install SDK**:
   ```bash
   cd C:\Terminal_3\dashboard
   npm install @google/genai
   ```
2. **Define Agent Tool Schemas**:
   - `verify_credential`: Evaluates buyer claims against policy.
   - `search_catalog`: Semantic search across available suppliers.
   - `request_supplier_quote`: Generates nonced quote with pricing.
   - `execute_tee_payment`: Dispatches signed payment request to the TEE hardware enclave.
3. **Wire Gemini Flash in `agent.ts`**:
   - Connect `GEMINI_API_KEY` from `.env.local` to execute dynamic multi-turn tool loops.
