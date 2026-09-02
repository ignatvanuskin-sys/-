"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function ListsPage() {
  const [lists, setLists] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/lists");
    const d = await r.json();
    setLists(d.lists || []);
  }
  useEffect(() => { load(); }, []);

  async function doPreview() {
    if (!raw.trim()) return;
    const r = await fetch("/api/lists/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawInput: raw }) });
    const d = await r.json();
    setPreview(d);
  }

  async function create() {
    if (!name || !raw) return;
    const r = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, rawInput: raw }) });
    const d = await r.json();
    if (!r.ok) setMsg(d.error);
    else { setMsg(`Создан список, добавлено ${d.insertedCount} адресатов`); setName(""); setRaw(""); setPreview(null); load(); }
  }

  async function del(id: number) {
    if (!confirm("Удалить список?")) return;
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
    load();
  }

  function exportCsv() {
    if (!preview) return;
    const rows = preview.recipients.filter((r: any) => r.valid).map((r: any) => `${r.email},${r.name||""},${r.company||""}`).join("\n");
    const blob = new Blob(["email,name,company\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "recipients.csv"; a.click();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Списки получателей</h1>

      <Card>
        <CardHeader>
          <CardTitle>Импорт получателей</CardTitle>
          <CardDescription>Вставьте список через запятую или таблицу из Excel/Google Sheets (email, name, company). Автоопределение формата, валидация и дедупликация.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Название списка</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Клиенты B2B март" />
          </div>
          <div className="space-y-2">
            <Label>Вставьте данные (поддерживается: a@x.com, b@y.com  или таблица с заголовком)</Label>
            <Textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={`email1@test.com, email2@test.com\nили\nemail\tname\tcompany\nivan@test.com\tИван\tООО Ромашка`} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={doPreview}>Превью</Button>
            <Button onClick={create}>Создать список</Button>
            {preview && <Button variant="ghost" onClick={exportCsv}>Экспорт CSV</Button>}
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}

          {preview && (
            <div className="space-y-2">
              <div className="text-sm text-zinc-600">
                Формат: <b>{preview.format}</b> | Заголовок: {preview.headerDetected ? "да" : "нет"} | Валидных: <b className="text-green-600">{preview.validCount}</b> | Невалидных: <b className="text-red-600">{preview.invalidCount}</b> | Дубликатов: {preview.duplicatesInInput}
              </div>
              <div className="max-h-64 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50"><tr><th className="text-left p-2">Email</th><th className="text-left p-2">Name</th><th className="text-left p-2">Company</th><th className="text-left p-2">Статус</th></tr></thead>
                  <tbody>
                    {preview.recipients.slice(0, 100).map((r: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.email}</td>
                        <td className="p-2">{r.name||""}</td>
                        <td className="p-2">{r.company||""}</td>
                        <td className="p-2">
                          {!r.valid && <span className="text-red-600">невалидный</span>}
                          {r.valid && r.isSuppressed && <span className="text-orange-600">в отписке</span>}
                          {r.valid && r.isDuplicateExisting && !r.isSuppressed && <span className="text-zinc-500">дубликат в БД</span>}
                          {r.valid && !r.isSuppressed && !r.isDuplicateExisting && <span className="text-green-600">ок</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.recipients.length > 100 && <p className="text-xs text-zinc-400">Показано 100 из {preview.recipients.length}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {lists.map((l) => (
          <Card key={l.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-zinc-500">{l.count} адресатов • {new Date(l.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/lists/${l.id}`}><Button variant="outline" size="sm">Открыть</Button></Link>
                <Button variant="ghost" size="sm" onClick={() => del(l.id)}>Удалить</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {lists.length===0 && <p className="text-sm text-zinc-500">Списков пока нет</p>}
      </div>
    </div>
  );
}
