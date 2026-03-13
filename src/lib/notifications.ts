import { prisma } from "@/lib/prisma";

export async function createNotification(opts: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  return prisma.notification.create({ data: opts });
}
