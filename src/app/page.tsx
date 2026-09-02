import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const sess = await verifySessionToken(token);
  if (sess) redirect("/dashboard");
  else redirect("/login");
}
