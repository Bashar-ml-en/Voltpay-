# Contributing to VaultPay

Thank you for your interest in contributing to **VaultPay**! We welcome contributions from developers, security researchers, and AI engineers.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js:** `v20.x` or higher
- **npm:** `v10.x` or higher
- **Git**

### Installation
```bash
# Clone the repository
git clone https://github.com/Bashar-ml-en/Vault-pay.git
cd Vault-pay

# Install root dependencies
npm install

# Install and build agent & MCP server
npm run build:agent

# Run core tests and MCP conformance verification
npm run test:all
```

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure all test suites pass with zero warnings:

```bash
# Run core agent & guardrail test suite
npm run test

# Run Model Context Protocol (MCP) verification suite
npm run mcp:verify

# Build Next.js 14 dashboard
npm run build:dashboard
```

---

## 📐 Coding Conventions

1. **Strict TypeScript:** No implicit `any`. All function inputs and outputs must be strongly typed.
2. **Deterministic Enclave Logic:** Any changes to `t3nEnclave.ts` must maintain compatibility with `contract/src/lib.rs`.
3. **Silicon Invariant Preservation:** Never introduce bypasses to the per-call cap (`$1,000.00`), session budget (`$5,000.00`), or vendor allowlist.
4. **Idempotency & Replay Protection:** Any new financial mutations must generate and record unique nonces.
5. **Stdio Safety in MCP:** Never write debug output to `stdout` in MCP components—use `console.error` (stderr) to avoid breaking JSON-RPC framing.

---

## 🔀 Pull Request Process

1. Fork the repository and create a feature branch (`git checkout -b feat/your-feature-name`).
2. Commit your changes using conventional commits (`feat: ...`, `fix: ...`, `docs: ...`, `test: ...`).
3. Ensure the GitHub Actions CI pipeline passes completely.
4. Submit your pull request against the `main` branch with a clear description of changes.
