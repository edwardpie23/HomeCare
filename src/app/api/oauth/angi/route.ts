import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const ANGI_CLIENT_ID = process.env.ANGI_CLIENT_ID || "";
const ANGI_CLIENT_SECRET = process.env.ANGI_CLIENT_SECRET || "";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/oauth/angi`;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.redirect(`${APP_URL}/login`);

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.redirect(`${APP_URL}/contractor/dashboard`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (!code && !error) {
    const stateToken = randomBytes(16).toString("hex");
    const params = new URLSearchParams({
      client_id: ANGI_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      state: stateToken,
    });
    // NOTE: Replace with real Angi OAuth URL when you have partner access
    return NextResponse.redirect(`https://api.angi.com/oauth/authorize?${params}`);
  }

  if (error) {
    return NextResponse.redirect(`${APP_URL}/contractor/settings/integrations?error=angi_denied`);
  }

  const tokenRes = await fetch("https://api.angi.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code!,
      redirect_uri: REDIRECT_URI,
      client_id: ANGI_CLIENT_ID,
      client_secret: ANGI_CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${APP_URL}/contractor/settings/integrations?error=angi_token_failed`
    );
  }

  const tokens = await tokenRes.json();

  await prisma.connectedAccount.upsert({
    where: { contractorId_platform: { contractorId: contractor.id, platform: "angi" } },
    create: {
      contractorId: contractor.id,
      platform: "angi",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      isActive: true,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      isActive: true,
    },
  });

  return NextResponse.redirect(
    `${APP_URL}/contractor/settings/integrations?success=angi`
  );
}
