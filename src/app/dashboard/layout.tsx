import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import LogoutButton from "./logout-button";
import { SidebarNav, MobileNav } from "./nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const sess = await verifySessionToken(token);
  if (!sess) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <aside className="w-64 bg-white border-r hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b">
          <h1 className="font-bold text-lg tracking-tight">Email Panel</h1>
          <p className="text-xs text-zinc-500 truncate mt-1">{sess.email}</p>
          <p className="text-[11px] text-zinc-400 mt-1">Персональная панель • 1 пользователь</p>
        </div>
        <SidebarNav />
        <div className="p-4 border-t bg-zinc-50/50">
          <div className="text-[11px] text-zinc-500 mb-2">Вошли как <b className="text-zinc-700">{sess.email}</b></div>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10">
          <span className="font-bold">Email Panel</span>
          <LogoutButton />
        </header>
        <MobileNav />
        <main className="p-4 md:p-6 flex-1 max-w-6xl w-full mx-auto">{children}</main>
        <footer className="p-4 text-center text-[11px] text-zinc-400 border-t bg-white">
          Email Panel • AI-уникализация • <span className="hidden sm:inline">Отписка • Inngest • Neon Postgres • </span>Сделано для лидгена
        </footer>
      </div>
    </div>
  );
}
