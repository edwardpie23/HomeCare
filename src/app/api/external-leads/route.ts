import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Not a contractor" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || undefined;
  const status = searchParams.get("status") || undefined;

  const leads = await prisma.externalLead.findMany({
    where: {
      contractorId: contractor.id,
      ...(platform ? { platform } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ leads });
}
