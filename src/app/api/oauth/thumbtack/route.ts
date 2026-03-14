import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

// Step 1: GET /api/oauth/thumbtack  — redirect contractor to Thumbtack OAuth
// Step 2: GET /api/oauth/thumbtack?code=xxx&state=xxx — callback from Thumbtack

const THUMBTACK_CLIENT_ID = process.env.THUMBTACK_CLIENT_ID || "";
const THUMBTACK_CLIENT_SECRET = process.env.THUMBTACK_CLIENT_SECRET || "";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/oauth/thumbtack`;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(`${APP_URL}/login`);
  }

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) {
    return NextResponse.redirect(`${APP_URL}/contractor/dashboard`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // — — — Step 1: Initiate OAuth — — —
  if (!code && !error) {
    const stateToken = randomBytes(16).toString("hex");
    // Store state in DB so we can verify it on callback
    await prisma.connectedAccount.upsert({
      where: { contractorId_platform: { contractorId: contractor.id, platform: "thumbtack" } },
      create: { contractorId: contractor.id, platform: "thumbtack", rawState: stateToken } as never,
      update: { rawState: stateToken } as never,
    });

    const params = new URLSearchParams({
      client_id: THUMBTACK_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "leads:read messages:read messages:write profile:read",
      state: stateToken,
    });

    // NOTE: Replace with real Thumbtack OAuth URL when you have partner access
    return NextResponse.redirect(
      `https://www.thumbtack.com/oauth/authorize?${params}`
    );
  }

  // — — — Step 2: OAuth Callback — — —
  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/contractor/settings/integrations?error=thumbtack_denied`
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.thumbtack.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code!,
      redirect_uri: REDIRECT_URI,
      client_id: THUMBTACK_CLIENT_ID,
      client_secret: THUMBTACK_CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${APP_URL}/contractor/settings/integrations?error=thumbtack_token_failed`
    );
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.connectedAccount.upsert({
    where: { contractorId_platform: { contractorId: contractor.id, platform: "thumbtack" } },
    create: {
      contractorId: contractor.id,
      platform: "thumbtack",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      isActive: true,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      isActive: true,
    },
  });

  return NextResponse.redirect(
    `${APP_URL}/contractor/settings/integrations?success=thumbtack`
  );
}
