import { NextResponse } from "next/server";
import { T3NEnclaveService } from "@/agent/t3nEnclave";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const enclave = T3NEnclaveService.getInstance();
    const telemetry = enclave.getTelemetry();
    return NextResponse.json(telemetry);
  } catch (error: any) {
    console.error("Telemetry error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
