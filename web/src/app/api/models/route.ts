import { NextRequest, NextResponse } from "next/server";

// Ensures this route is never cached!
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  let baseUrl = process.env.NEXT_PUBLIC_VLLM_URL;
  const apiKey = process.env.VLLM_API_KEY;
  const headers = new Headers();

  if (apiKey !== undefined) {
    headers.set("Authorization", `Bearer ${apiKey}`);
    headers.set("api-key", apiKey);
  }

  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_VLLM_URL is not set" },
      { status: 500 }
    );
  }

  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const envModel = process.env.VLLM_MODEL;
  if (envModel) {
    return NextResponse.json({
      object: "list",
      data: [{ id: envModel }],
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: headers,
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `vLLM Error: ${res.statusText}` },
        { status: res.status }
      );
    }

    return new NextResponse(res.body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("API Route Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Connection Failed: Anni VLLM server is offline to save costs.",
        details: error.message,
      },
      { status: 503 }
    );
  }
}