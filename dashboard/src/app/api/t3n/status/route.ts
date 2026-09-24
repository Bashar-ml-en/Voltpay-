import { NextResponse } from "next/server";
import { T3NEnclaveService } from "@/agent/t3nEnclave";

export const dynamic = "force-dynamic";

export async function GET() {
  const accountId = process.env.T3N_ACCOUNT_ID || "";
  const apiKey = process.env.T3N_PRIVATE_API_KEY || "";
  const rpcUrl = process.env.T3N_RPC_URL || "https://rpc.t3n.network";
  const mockEnv = process.env.MOCK_T3N;
  const isMock = mockEnv !== "0";

  const enclave = T3NEnclaveService.getInstance();
  const telemetry = enclave.getTelemetry();

  let gatewayReachable = false;
  let latencyMs: number | null = null;
  let gatewayError: string | null = null;

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(rpcUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    }).catch(async () => {
      return await fetch("https://terminal3.io", {
        method: "HEAD",
        signal: controller.signal,
      });
    });

    clearTimeout(timeout);
    latencyMs = Date.now() - start;
    gatewayReachable = res ? res.status < 500 : false;
  } catch (err: any) {
    gatewayError = err?.message || "Gateway unreachable";
  }

  const isConfigured = Boolean(accountId && apiKey && !isMock);

  return NextResponse.json({
    status: isConfigured ? "LIVE_CONNECTED" : "EMULATED_SGX",
    networkMode: telemetry.networkMode,
    isLive: !isMock,
    hasAccountId: Boolean(accountId),
    hasApiKey: Boolean(apiKey),
    maskedAccountId: accountId ? accountId.slice(0, 8) + "..." : null,
    rpcUrl,
    t3nCredits: telemetry.t3nCredits,
    gatewayReachable,
    latencyMs,
    gatewayError,
    enclaveDid: telemetry.enclaveDid,
    envStatus: {
      T3N_ACCOUNT_ID: accountId ? "CONFIGURED" : "MISSING",
      T3N_PRIVATE_API_KEY: apiKey ? "CONFIGURED" : "MISSING",
      T3N_RPC_URL: rpcUrl,
      MOCK_T3N: mockEnv ? mockEnv : "1 (Emulated Mode)",
    },
    setupInstructions: {
      step1: "Create a free Terminal 3 Developer account at https://go.terminal3.io",
      step2: "Generate an API Key and copy your Account ID under Developer Settings",
      step3: "Add T3N_ACCOUNT_ID, T3N_PRIVATE_API_KEY, T3N_RPC_URL, and MOCK_T3N=0 in your .env.local or Vercel Settings",
      step4: "Redeploy or restart the application to activate hardware RPC dispatch",
    },
  });
}
