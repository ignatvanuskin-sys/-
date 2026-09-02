import { db, getDbType } from "@/lib/db";
import { campaigns, campaignRecipients, recipientLists, templates } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dbType = getDbType();
  const memoryBanner = dbType === "memory" ? (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4 text-sm">
        <b>🆓 Бесплатный режим — in-memory DB (pg-mem)</b> — данные хранятся в памяти и пропадут после перезапуска. Для продакшена задайте <code>DATABASE_URL</code> (Neon — бесплатный тариф, 0.5GB). Всё остальное (SMTP Ethereal, AI-mock) уже бесплатно.
      </CardContent>
    </Card>
  ) : null;
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

  const isEmpty = camps.length === 0 && lists.length === 0 && tmpls.length === 0;
  return (
    <div className="space-y-6">
      {memoryBanner}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
          <p className="text-sm text-zinc-500 mt-1">Отслеживайте прогресс рассылок и быстро переходите к созданию</p>
        </div>
        <Link href="/dashboard/campaigns">
          <Button size="lg">Создать кампанию →</Button>
        </Link>
      </div>

      {isEmpty && (
        <Card className="border-dashed bg-white">
          <CardHeader>
            <CardTitle className="text-base">👋 Добро пожаловать — 3 шага до первой рассылки</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg border p-4 bg-zinc-50">
              <div className="font-medium">1. Подключите почту</div>
              <p className="text-zinc-500 text-xs mt-1">Gmail/Yandex или 1 клик Ethereal (бесплатно, без пароля) — проверьте тестовым письмом.</p>
              <Link href="/dashboard/mailbox"><Button variant="outline" size="sm" className="mt-3">Настроить →</Button></Link>
            </div>
            <div className="rounded-lg border p-4 bg-zinc-50">
              <div className="font-medium">2. Загрузите список</div>
              <p className="text-zinc-500 text-xs mt-1">Вставьте через запятую или таблицу из Excel (email, name, company) — превью покажет ошибки.</p>
              <Link href="/dashboard/lists"><Button variant="outline" size="sm" className="mt-3">Импорт →</Button></Link>
            </div>
            <div className="rounded-lg border p-4 bg-zinc-50">
              <div className="font-medium">3. Создайте шаблон и кампанию</div>
              <p className="text-zinc-500 text-xs mt-1">Spintax {"{Привет|Здравствуйте}"} + AI-уникализация, задержка 30-90с, лимит 300/день.</p>
              <Link href="/dashboard/templates"><Button variant="outline" size="sm" className="mt-3">Шаблон →</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

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
