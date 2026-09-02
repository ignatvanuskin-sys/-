"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [previewData, setPreviewData] = useState({ name: "Иван", company: "ООО Тест", email: "ivan@test.com" });
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/templates");
    const d = await r.json();
    setTemplates(d.templates || []);
  }
  useEffect(() => { load(); }, []);

  function renderPreview() {
    if (!form.subject || !form.body) {
      setPreview({ subject: "Заполните тему и тело", body: "Превью появится здесь" });
      return;
    }
    let s = form.subject;
    let b = form.body;
    s = s.replace(/\{\{name\}\}/g, previewData.name).replace(/\{\{company\}\}/g, previewData.company).replace(/\{\{email\}\}/g, previewData.email);
    b = b.replace(/\{\{name\}\}/g, previewData.name).replace(/\{\{company\}\}/g, previewData.company).replace(/\{\{email\}\}/g, previewData.email);
    // spintax: random pick (как в реальной отправке), не первый
    const spintaxRandom = (t: string) => {
      let r = t;
      // Simple random for preview
      r = r.replace(/\{([^{}]*)\}/g, (_: any, g: string) => {
        if (!g.includes("|")) return `{${g}}`;
        const opts = g.split("|");
        return opts[Math.floor(Math.random() * opts.length)];
      });
      return r;
    };
    b = spintaxRandom(b);
    s = spintaxRandom(s);
    setPreview({ subject: s, body: b });
  }

  async function save() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      alert("Заполните название, тему и тело");
      return;
    }
    setSaving(true);
    if (editing) {
      await fetch(`/api/templates/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false);
    setForm({ name: "", subject: "", body: "" });
    setEditing(null);
    setPreview(null);
    load();
  }
  function edit(t: any) {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, body: t.body });
  }
  async function del(id: number) {
    if (!confirm("Удалить шаблон?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Шаблоны писем</h1>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Редактировать" : "Новый шаблон"}</CardTitle>
          <CardDescription>Поддерживаются плейсхолдеры {"{{name}}"}, {"{{company}}"}, {"{{email}}"} + кастомные поля. Спинтакс: {"{Привет|Здравствуйте|Добрый день}"}, {"{{name}}!"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Название</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Холодный контакт v1" /></div>
          <div className="space-y-2"><Label>Тема</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="{Привет|Здравствуйте}, {{company}} — предложение" /></div>
          <div className="space-y-2"><Label>Тело (markdown поддерживается)</Label><Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={`{Привет|Добрый день}, {{name}}!\n\nПишу по поводу {{company}}. Предлагаю обсудить...\n\nСсылка: https://example.com\n`} /></div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "Сохраняем..." : editing ? "Сохранить" : "Создать"}</Button>
            {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ name:"", subject:"", body:""}); }}>Отмена</Button>}
            <Button variant="ghost" onClick={renderPreview}>Превью (рандом)</Button>
          </div>
          <p className="text-xs text-zinc-500">💡 Совет: используйте <code className="bg-zinc-100 px-1 rounded">{"{{name}}"}, {"{{company}}"}</code> и спинтакс <code className="bg-zinc-100 px-1 rounded">{"{Привет|Здравствуйте}"}</code>. Ссылки и отписка сохранятся автоматически (проверяется AI).</p>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div><Label>Тест name</Label><Input value={previewData.name} onChange={(e) => setPreviewData({ ...previewData, name: e.target.value })} /></div>
            <div><Label>company</Label><Input value={previewData.company} onChange={(e) => setPreviewData({ ...previewData, company: e.target.value })} /></div>
            <div><Label>email</Label><Input value={previewData.email} onChange={(e) => setPreviewData({ ...previewData, email: e.target.value })} /></div>
          </div>
          {preview && (
            <div className="border rounded p-4 bg-zinc-50 space-y-2">
              <div className="text-sm"><b>Тема:</b> {preview.subject}</div>
              <div className="text-sm whitespace-pre-wrap border-t pt-2">{preview.body}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="font-medium">Ваши шаблоны ({templates.length})</h3>
        {templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">✉️</div>
              <p className="text-sm text-zinc-600">Шаблонов нет</p>
              <p className="text-xs text-zinc-500 mt-1">Создайте первый шаблон выше — например, «Холодный контакт» с темой <code className="bg-zinc-100 px-1 rounded">{"{Привет|Здравствуйте}, {{company}}"}</code>.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map((t) => (
              <Card key={t.id} className="hover:shadow-sm transition">
                <CardContent className="p-4">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-sm text-zinc-500 truncate">Тема: {t.subject}</div>
                      <div className="text-xs text-zinc-400 whitespace-pre-wrap mt-2 line-clamp-2 bg-zinc-50 p-2 rounded">{t.body.slice(0, 200)}</div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => edit(t)}>Редактировать</Button>
                      <Button variant="ghost" size="sm" onClick={() => del(t.id)}>Удалить</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
