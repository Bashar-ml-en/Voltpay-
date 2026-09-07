import { NextResponse } from "next/server";
import { T3NEnclaveService } from "@/agent/t3nEnclave";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const enclave = T3NEnclaveService.getInstance();
    enclave.resetEnclave();
    return NextResponse.json({
      success: true,
      message: "Enclave state reset to initial state with fresh budget.",
    });
  } catch (error: any) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
