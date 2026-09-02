import { db, isDbConfigured } from "@/lib/db";
import { campaigns, campaignRecipients, recipientLists, templates } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isDbConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <Card>
          <CardHeader>
            <CardTitle>DATABASE_URL не настроен</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600">Заполните DATABASE_URL в .env и перезапустите сервер. Пока используется заглушка.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  const camps = await db.select().from(campaigns);
  const lists = await db.select().from(recipientLists);
  const tmpls = await db.select().from(templates);
  const allCrs = await db.select().from(campaignRecipients);

  const counts = {
    total: camps.length,
    running: camps.filter((c: typeof camps[number]) => c.status === "running").length,
    completed: camps.filter((c: typeof camps[number]) => c.status === "completed").length,
    paused: camps.filter((c: typeof camps[number]) => c.status === "paused").length,
  };

  const sent = allCrs.filter((r: typeof allCrs[number]) => r.status === "sent").length;
  const errors = allCrs.filter((r: typeof allCrs[number]) => r.status === "error").length;
  const queued = allCrs.filter((r: typeof allCrs[number]) => r.status === "queued").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <Link href="/dashboard/campaigns">
          <Button>Создать кампанию</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Кампаний</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
            <div className="text-xs text-zinc-500">выполняется: {counts.running} | завершено: {counts.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Списков</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lists.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Шаблонов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tmpls.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Отправлено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sent}</div>
            <div className="text-xs text-zinc-500">очередь: {queued} | ошибки: {errors}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние кампании</CardTitle>
        </CardHeader>
        <CardContent>
          {camps.length === 0 ? (
            <p className="text-sm text-zinc-500">Кампаний пока нет. Создайте первую.</p>
          ) : (
            <div className="space-y-2">
              {camps.slice(0, 5).map((c: typeof camps[number]) => (
                <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="flex justify-between items-center p-3 border rounded hover:bg-zinc-50">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-zinc-500">{c.mode} • {c.status}</div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-zinc-100 rounded">{c.status}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
