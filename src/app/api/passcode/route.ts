import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const expectedPasscode = process.env.APP_PASSCODE;
  if (!expectedPasscode) {
    return NextResponse.json({ message: "APP_PASSCODE is not configured on the server." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let passcode: unknown;
  try {
    const body = await request.json();
    passcode = body?.passcode;
  } catch {
    return NextResponse.json({ message: "Enter the passcode and try again." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (typeof passcode !== "string" || passcode !== expectedPasscode) {
    return NextResponse.json({ message: "That passcode doesn’t match. Try again." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
