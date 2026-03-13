import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role === "admin") redirect("/admin");
  if (role === "contractor") redirect("/contractor/dashboard");
  redirect("/my-jobs");
}
