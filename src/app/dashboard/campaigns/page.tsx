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

  async function create() {
    const res = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else { setForm({ ...form, name: "" }); load(); }
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
          <CardDescription>Выберите список + шаблон + режим уникализации + настройки отправки (задержка, лимиты, окно).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Название</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Шаблон</Label><Select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}><option value="">выберите</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Список получателей</Label><Select value={form.listId} onChange={(e) => setForm({ ...form, listId: e.target.value })}><option value="">выберите</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.count})</option>)}</Select></div>
            <div className="space-y-2"><Label>Режим уникализации</Label><Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option value="spintax">Spintax</option><option value="ai">AI-перефразирование</option><option value="combined">Spintax + AI</option></Select></div>
          </div>

          {(form.mode === "ai" || form.mode === "combined") && (
            <div className="space-y-2">
              <Label>Степень уникализации (AI)</Label>
              <Select value={form.variationLevel} onChange={(e) => setForm({ ...form, variationLevel: e.target.value })}>
                <option value="light">Лёгкая (10-20%)</option>
                <option value="medium">Средняя (30-50%)</option>
                <option value="strong">Сильная (60-80%)</option>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Задержка мин (сек)</Label><Input type="number" value={form.delayMinSec} onChange={(e) => setForm({ ...form, delayMinSec: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Задержка макс (сек)</Label><Input type="number" value={form.delayMaxSec} onChange={(e) => setForm({ ...form, delayMaxSec: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Дневной лимит</Label><Input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Окно отправки start (09:00)</Label><Input value={form.sendWindowStart} onChange={(e) => setForm({ ...form, sendWindowStart: e.target.value })} placeholder="09:00" /></div>
            <div className="space-y-2"><Label>Окно end (18:00)</Label><Input value={form.sendWindowEnd} onChange={(e) => setForm({ ...form, sendWindowEnd: e.target.value })} placeholder="18:00" /></div>
          </div>

          <Button onClick={create}>Создать</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {camps.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium"><Link className="hover:underline" href={`/dashboard/campaigns/${c.id}`}>{c.name}</Link> <span className="text-xs px-2 py-0.5 rounded bg-zinc-100">{c.status}</span></div>
                <div className="text-xs text-zinc-500">{c.mode} • {c.variationLevel} • задержка {c.delayMinSec}-{c.delayMaxSec}с • лимит {c.dailyLimit}/день</div>
                {c.counts && <div className="text-xs">отправлено {c.counts.sent}/{c.counts.total} • очередь {c.counts.queued} • ошибки {c.counts.error}</div>}
              </div>
              <div className="flex gap-1">
                {c.status === "draft" && <Button size="sm" onClick={() => control(c.id, "start")}>Запустить</Button>}
                {c.status === "running" && <Button variant="outline" size="sm" onClick={() => control(c.id, "pause")}>Пауза</Button>}
                {c.status === "paused" && <Button size="sm" onClick={() => control(c.id, "resume")}>Продолжить</Button>}
                {(c.status === "running" || c.status === "paused") && <Button variant="destructive" size="sm" onClick={() => control(c.id, "cancel")}>Отменить</Button>}
                <Link href={`/dashboard/campaigns/${c.id}`}><Button variant="ghost" size="sm">Лог</Button></Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {camps.length===0 && <p className="text-sm text-zinc-500">Кампаний нет</p>}
      </div>
    </div>
  );
}
