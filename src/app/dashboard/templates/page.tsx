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

  async function load() {
    const r = await fetch("/api/templates");
    const d = await r.json();
    setTemplates(d.templates || []);
  }
  useEffect(() => { load(); }, []);

  function renderPreview() {
    let s = form.subject;
    let b = form.body;
    s = s.replace(/\{\{name\}\}/g, previewData.name).replace(/\{\{company\}\}/g, previewData.company).replace(/\{\{email\}\}/g, previewData.email);
    b = b.replace(/\{\{name\}\}/g, previewData.name).replace(/\{\{company\}\}/g, previewData.company).replace(/\{\{email\}\}/g, previewData.email);
    // simple spintax preview: pick first option
    b = b.replace(/\{([^{}]*)\}/g, (_: any, g: string) => g.split("|")[0]);
    s = s.replace(/\{([^{}]*)\}/g, (_: any, g: string) => g.split("|")[0]);
    setPreview({ subject: s, body: b });
  }

  async function save() {
    if (editing) {
      await fetch(`/api/templates/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setForm({ name: "", subject: "", body: "" });
    setEditing(null);
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
            <Button onClick={save}>{editing ? "Сохранить" : "Создать"}</Button>
            {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ name:"", subject:"", body:""}); }}>Отмена</Button>}
            <Button variant="ghost" onClick={renderPreview}>Превью</Button>
          </div>

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

      <div className="grid gap-4">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-zinc-500">Тема: {t.subject}</div>
                  <div className="text-xs text-zinc-400 whitespace-pre-wrap mt-2 line-clamp-3">{t.body.slice(0, 200)}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => edit(t)}>Редактировать</Button>
                  <Button variant="ghost" size="sm" onClick={() => del(t.id)}>Удалить</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length===0 && <p className="text-sm text-zinc-500">Шаблонов нет</p>}
      </div>
    </div>
  );
}
