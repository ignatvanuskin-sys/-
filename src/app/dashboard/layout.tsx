import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import LogoutButton from "./logout-button";

const nav = [
  { href: "/dashboard", label: "Дашборд" },
  { href: "/dashboard/lists", label: "Списки" },
  { href: "/dashboard/templates", label: "Шаблоны" },
  { href: "/dashboard/campaigns", label: "Кампании" },
  { href: "/dashboard/mailbox", label: "Почтовый ящик" },
  { href: "/dashboard/suppression", label: "Отписки" },
  { href: "/dashboard/settings", label: "Настройки" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const sess = await verifySessionToken(token);
  if (!sess) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <aside className="w-64 bg-white border-r hidden md:flex flex-col">
        <div className="p-6 border-b">
          <h1 className="font-bold text-lg">Email Panel</h1>
          <p className="text-xs text-zinc-500 truncate">{sess.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="block px-3 py-2 rounded-md text-sm hover:bg-zinc-100">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white border-b p-4 flex justify-between items-center">
          <span className="font-bold">Email Panel</span>
          <LogoutButton />
        </header>
        <nav className="md:hidden bg-white border-b p-2 flex gap-2 overflow-auto">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="px-3 py-1 text-sm bg-zinc-100 rounded whitespace-nowrap">
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
