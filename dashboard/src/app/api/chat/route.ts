import { NextResponse } from "next/server";
import { VaultPayAgent, DEFAULT_AUTHORIZED_VC } from "../../../../../agent/src/agent";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, vc, isAdversarialTest, customAmountCents, customVendor } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const agent = new VaultPayAgent();
    const response = await agent.processRequest(prompt, vc || DEFAULT_AUTHORIZED_VC, {
      forceAdversarialInjection: !!isAdversarialTest,
      customAmountCents,
      customVendor,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Agent chat error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
