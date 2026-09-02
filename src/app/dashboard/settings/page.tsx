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

  async function save() {
    const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stopAll, footerAddress: footer }) });
    await r.json();
    if (r.ok) setMsg("Сохранено");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Настройки</h1>
      <Card>
        <CardHeader>
          <CardTitle>Глобальные настройки</CardTitle>
          <CardDescription>Остановить все рассылки, футер, compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={stopAll} onChange={(e) => setStopAll(e.target.checked)} id="stopAll" />
            <Label htmlFor="stopAll" className="text-red-600 font-bold">Глобально остановить все рассылки</Label>
          </div>
          <div className="space-y-2">
            <Label>Адрес/контакт в футере письма (опционально)</Label>
            <Input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="ООО Пример, г. Москва, ул. Тверская 1" />
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          <Button onClick={save}>Сохранить</Button>
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
