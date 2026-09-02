"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Rocket, Mail, UserX, Settings, HelpCircle } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/dashboard/lists", label: "Списки", icon: Users },
  { href: "/dashboard/templates", label: "Шаблоны", icon: FileText },
  { href: "/dashboard/campaigns", label: "Кампании", icon: Rocket },
  { href: "/dashboard/mailbox", label: "Почта", icon: Mail },
  { href: "/dashboard/suppression", label: "Отписки", icon: UserX },
  { href: "/dashboard/settings", label: "Настройки", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-1">
      {items.map((it) => {
        const active = pathname === it.href || (it.href !== "/dashboard" && pathname.startsWith(it.href));
        const Icon = it.icon;
        return (
          <Link key={it.href} href={it.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"}`}>
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
      <div className="pt-4 mt-4 border-t">
        <a href="https://github.com" target="_blank" className="flex items-center gap-3 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700">
          <HelpCircle className="h-4 w-4" /> Поддержка
        </a>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-auto p-2 bg-white border-b md:hidden">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link key={it.href} href={it.href} className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap ${active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}>
            <Icon className="h-3.5 w-3.5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
