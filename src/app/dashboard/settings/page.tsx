"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [stopAll, setStopAll] = useState(false);
  const [footer, setFooter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/settings");
    const d = await r.json();
    if (d.settings) { setStopAll(!!d.settings.stopAll); setFooter(d.settings.footerAddress || ""); }
  }
  useEffect(() => { load(); }, []);

  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stopAll, footerAddress: footer }) });
    await r.json();
    setSaving(false);
    if (r.ok) {
      setMsg("✅ Сохранено");
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Настройки</h1>
      <p className="text-sm text-zinc-500 -mt-4">Глобальные переключатели, compliance и подсказки для деплоя.</p>
      <Card className={stopAll ? "border-red-200 bg-red-50" : ""}>
        <CardHeader>
          <CardTitle>Глобальные настройки</CardTitle>
          <CardDescription>Остановить все рассылки, футер, compliance — требования ТЗ §6</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${stopAll ? "bg-red-100 border-red-200" : "bg-zinc-50"}`}>
            <input type="checkbox" checked={stopAll} onChange={(e) => setStopAll(e.target.checked)} id="stopAll" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="stopAll" className={`font-bold ${stopAll ? "text-red-700" : "text-zinc-700"}`}>🚨 Глобально остановить все рассылки</Label>
              <p className="text-xs text-zinc-500 mt-1">Если включено — ни одна кампания не отправит ни одного письма (проверяется в <code className="bg-white px-1 rounded">/api/campaigns/[id]/run</code> и Inngest). Используйте как «аварийный стоп».</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Адрес/контакт в футере письма (опционально, для compliance)</Label>
            <Input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="ООО Пример, г. Москва, ул. Тверская 1, ИНН 1234567890" />
            <p className="text-[11px] text-zinc-500">Добавляется в каждое письмо после ссылки отписки: <code className="bg-zinc-100 px-1 rounded">Чтобы отписаться: отписаться</code> + ваш адрес.</p>
          </div>
          {msg && <div className="rounded-md bg-green-50 border border-green-200 p-2 text-sm text-green-800">{msg}</div>}
          <Button onClick={save} disabled={saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
        <CardContent className="text-sm text-zinc-600 space-y-2">
          <p>• Каждое письмо содержит уникальную ссылку отписки, автоматически добавляет в suppression list.</p>
          <p>• Никакой подделки домена/from-адреса — отправка только с подключенного ящика.</p>
          <p>• Тема не должна вводить в заблуждение — ответственность отправителя.</p>
          <p>• Трекинг открытий (pixel) — вне MVP.</p>
        </CardContent>
      </Card>
    </div>
  );
}
