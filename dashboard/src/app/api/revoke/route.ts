import { NextResponse } from "next/server";
import { T3NEnclaveService } from "../../../../../agent/src/t3nEnclave";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const enclave = T3NEnclaveService.getInstance();
    const result = enclave.emergencyRevoke();
    return NextResponse.json({
      success: true,
      message: "Emergency revocation executed. Agent tenant privileges permanently severed at hardware enclave level.",
      ...result,
    });
  } catch (error: any) {
    console.error("Revocation error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
