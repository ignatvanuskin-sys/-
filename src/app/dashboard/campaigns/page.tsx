"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import Link from "next/link";

export default function CampaignsPage() {
  const [camps, setCamps] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [_mailboxes, setMailboxes] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    templateId: "",
    listId: "",
    mailboxId: "",
    mode: "spintax",
    variationLevel: "medium",
    delayMinSec: 30,
    delayMaxSec: 90,
    dailyLimit: 300,
    sendWindowStart: "",
    sendWindowEnd: "",
  });

  async function load() {
    const [c, l, t, m] = await Promise.all([
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/lists").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/mailbox").then((r) => r.json()).then((d) => ({ mailboxes: d.mailbox ? [d.mailbox] : [] })),
    ]);
    setCamps(c.campaigns || []);
    setLists(l.lists || []);
    setTemplates(t.templates || []);
    setMailboxes(m.mailboxes || []);
  }
  useEffect(() => { load(); }, []);

  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function create() {
    if (!form.name.trim()) { setMsg("Укажите название кампании"); return; }
    if (!form.templateId) { setMsg("Выберите шаблон"); return; }
    if (!form.listId) { setMsg("Выберите список получателей"); return; }
    if (form.delayMinSec > form.delayMaxSec) { setMsg("Мин задержка не может быть больше макс"); return; }
    setCreating(true);
    setMsg(null);
    const res = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) setMsg(data.error);
    else { setMsg(`✅ Кампания "${form.name}" создана — ${data.campaign ? "" : ""}можно запускать`); setForm({ ...form, name: "" }); load(); }
  }

  async function control(id: number, action: string) {
    // Use new endpoints: /control for start/pause/cancel, and /run for actual sending (fallback without Inngest)
    if (action === "start") {
      await fetch(`/api/campaigns/${id}/control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      // Also trigger run (inline)
      const r = await fetch(`/api/campaigns/${id}/run`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) alert(d.error);
      else alert(`Запущено, обработано ${d.processed}, осталось в очереди ${d.remainingQueued}`);
    } else {
      await fetch(`/api/campaigns/${id}/control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    }
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Кампании</h1>

      <Card>
        <CardHeader>
          <CardTitle>Новая кампания</CardTitle>
          <CardDescription>Соберите рассылку за 30 сек: список + шаблон + как уникализировать + когда отправлять.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Название *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="B2B март — холодные" /><p className="text-[11px] text-zinc-500">Пример: «Тест 3 контакта» для проверки.</p></div>
            <div className="space-y-2"><Label>Шаблон *</Label><Select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}><option value="">выберите шаблон</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>{templates.length === 0 && <p className="text-xs text-amber-600">Сначала создайте шаблон → <Link href="/dashboard/templates" className="underline">Шаблоны</Link></p>}</div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Список получателей *</Label><Select value={form.listId} onChange={(e) => setForm({ ...form, listId: e.target.value })}><option value="">выберите список</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.count})</option>)}</Select>{lists.length === 0 && <p className="text-xs text-amber-600">Сначала загрузите список → <Link href="/dashboard/lists" className="underline">Списки</Link></p>}</div>
            <div className="space-y-2"><Label>Режим уникализации</Label><Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option value="spintax">Spintax — бесплатно, рандом из {"{a|b}"}</option><option value="ai">AI — перефразирует каждое (нужен ANTHROPIC_API_KEY, иначе mock)</option><option value="combined">Spintax + AI — максимально уникально</option></Select><p className="text-[11px] text-zinc-500">Spintax для теста (0 ₽), AI для продакшена.</p></div>
          </div>

          {(form.mode === "ai" || form.mode === "combined") && (
            <div className="space-y-2">
              <Label>Степень уникализации (AI)</Label>
              <Select value={form.variationLevel} onChange={(e) => setForm({ ...form, variationLevel: e.target.value })}>
                <option value="light">Лёгкая (10-20%) — минимальные правки</option>
                <option value="medium">Средняя (30-50%) — баланс</option>
                <option value="strong">Сильная (60-80%) — почти новый текст</option>
              </Select>
              <p className="text-[11px] text-zinc-500">Ссылки, {"{{name}}"} и отписка сохранятся (проверяется retry).</p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Задержка мин (сек)</Label><Input type="number" value={form.delayMinSec} onChange={(e) => setForm({ ...form, delayMinSec: Number(e.target.value) })} /><p className="text-[11px] text-zinc-500">Для теста 10, для боя 30.</p></div>
            <div className="space-y-2"><Label>Задержка макс (сек)</Label><Input type="number" value={form.delayMaxSec} onChange={(e) => setForm({ ...form, delayMaxSec: Number(e.target.value) })} /><p className="text-[11px] text-zinc-500">Рандом между мин-макс.</p></div>
            <div className="space-y-2"><Label>Дневной лимит</Label><Input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })} /><p className="text-[11px] text-zinc-500">300 — безопасно для Gmail.</p></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Окно отправки — с (09:00)</Label><Input value={form.sendWindowStart} onChange={(e) => setForm({ ...form, sendWindowStart: e.target.value })} placeholder="09:00" /><p className="text-[11px] text-zinc-500">Пусто = круглосуточно.</p></div>
            <div className="space-y-2"><Label>Окно — до (18:00)</Label><Input value={form.sendWindowEnd} onChange={(e) => setForm({ ...form, sendWindowEnd: e.target.value })} placeholder="18:00" /></div>
          </div>

          {msg && <div className={`rounded-md border p-3 text-sm ${msg.includes("✅") ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>{msg}</div>}
          <Button onClick={create} disabled={creating} size="lg">{creating ? "Создаём..." : "Создать кампанию"}</Button>
          <p className="text-xs text-zinc-500">После создания нажмите <b>Запустить</b> в списке ниже. Для проверки — 3 адреса, Spintax, 10-20 сек задержка.</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-medium">Ваши кампании ({camps.length})</h3>
        {camps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">🚀</div>
              <p className="text-sm text-zinc-600">Кампаний нет</p>
              <p className="text-xs text-zinc-500 mt-1">Создайте первую выше — выберите список и шаблон, нажмите «Создать», затем «Запустить».</p>
            </CardContent>
          </Card>
        ) : (
          camps.map((c) => {
            const statusColor: Record<string, string> = { draft: "bg-zinc-100 text-zinc-700", running: "bg-blue-100 text-blue-700", paused: "bg-amber-100 text-amber-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
            return (
              <Card key={c.id} className="hover:shadow-sm transition">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <Link className="hover:underline truncate" href={`/dashboard/campaigns/${c.id}`}>{c.name}</Link>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColor[c.status] || "bg-zinc-100"}`}>{c.status}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{c.mode} • {c.variationLevel} • {c.delayMinSec}-{c.delayMaxSec}с • лимит {c.dailyLimit}/день {c.sendWindowStart && `• ${c.sendWindowStart}-${c.sendWindowEnd}`}</div>
                    {c.counts && <div className="text-xs mt-1 font-mono">отправлено <b className="text-green-700">{c.counts.sent}</b>/{c.counts.total} • очередь {c.counts.queued} • ошибки <b className="text-red-600">{c.counts.error}</b> {c.counts.skipped ? `• skip ${c.counts.skipped}` : ""}</div>}
                  </div>
                  <div className="flex gap-1 flex-wrap shrink-0">
                    {c.status === "draft" && <Button size="sm" onClick={() => control(c.id, "start")}>▶ Запустить</Button>}
                    {c.status === "running" && <Button variant="outline" size="sm" onClick={() => control(c.id, "pause")}>⏸ Пауза</Button>}
                    {c.status === "paused" && <Button size="sm" onClick={() => control(c.id, "resume")}>▶ Продолжить</Button>}
                    {(c.status === "running" || c.status === "paused") && <Button variant="destructive" size="sm" onClick={() => control(c.id, "cancel")}>Отменить</Button>}
                    <Link href={`/dashboard/campaigns/${c.id}`}><Button variant="ghost" size="sm">Лог →</Button></Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
