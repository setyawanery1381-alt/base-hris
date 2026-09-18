import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.roles.includes("EMPLOYEE") && !session.roles.includes("HR_ADMIN") && !session.roles.includes("SUPER_ADMIN")) {
    redirect("/employee");
  }

  redirect("/admin/dashboard");
}