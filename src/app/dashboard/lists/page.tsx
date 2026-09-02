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
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await fetch("/api/lists");
    const d = await r.json();
    setLists(d.lists || []);
  }
  useEffect(() => { load(); }, []);

  async function doPreview() {
    if (!raw.trim()) {
      setMsg("Вставьте данные для превью");
      return;
    }
    setLoadingPreview(true);
    const r = await fetch("/api/lists/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawInput: raw }) });
    const d = await r.json();
    setLoadingPreview(false);
    setPreview(d);
    if (d.invalidCount > 0) setMsg(`Найдено невалидных: ${d.invalidCount} — они не попадут в список`);
  }

  async function create() {
    if (!name.trim()) {
      setMsg("Укажите название списка");
      return;
    }
    if (!raw.trim()) {
      setMsg("Вставьте данные");
      return;
    }
    setCreating(true);
    const r = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, rawInput: raw }) });
    const d = await r.json();
    setCreating(false);
    if (!r.ok) setMsg(d.error);
    else { setMsg(`✅ Создан список "${name}", добавлено ${d.insertedCount} адресатов (пропущено в отписке: ${d.suppressedSkipped || 0})`); setName(""); setRaw(""); setPreview(null); load(); }
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
            <Label>Название списка *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Клиенты B2B март — холодные" />
            <p className="text-[11px] text-zinc-500">Используйте понятное имя: «B2B март», «Тест 3 контакта».</p>
          </div>
          <div className="space-y-2">
            <Label>Вставьте данные *</Label>
            <Textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={`Через запятую:\nivan@test.com, petr@test.com, test@gmail.com\n\nИли таблица из Excel/Google Sheets (скопируйте прямо из таблицы):\nemail\tname\tcompany\nivan@test.com\tИван\tООО Ромашка\npetr@test.com\tПётр\tИП Петров`} />
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setRaw("test1@gmail.com, test2@gmail.com, test3@gmail.com")} className="text-zinc-500 hover:text-zinc-700 underline">Пример: запятая</button>
              <button type="button" onClick={() => setRaw("email\tname\tcompany\nivan@test.com\tИван\tООО Ромашка\npetr@test.com\tПётр\tИП Петров")} className="text-zinc-500 hover:text-zinc-700 underline">Пример: таблица</button>
              <button type="button" onClick={() => setRaw("")} className="text-zinc-500 hover:text-zinc-700 underline">Очистить</button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={doPreview} disabled={loadingPreview}>{loadingPreview ? "Проверяем..." : "Превью"}</Button>
            <Button onClick={create} disabled={creating}>{creating ? "Создаём..." : "Создать список"}</Button>
            {preview && <Button variant="ghost" onClick={exportCsv}>Экспорт CSV</Button>}
          </div>
          {msg && <div className={`rounded-md border p-3 text-sm ${msg.includes("✅") ? "bg-green-50 border-green-200 text-green-800" : msg.includes("невалидных") ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-green-50 border-green-200 text-green-800"}`}>{msg}</div>}

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

      <div className="space-y-2">
        <h3 className="font-medium">Ваши списки ({lists.length})</h3>
        {lists.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm text-zinc-600">Списков пока нет</p>
              <p className="text-xs text-zinc-500 mt-1">Создайте первый список выше — вставьте 3 тестовых email через запятую и нажмите «Превью».</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {lists.map((l) => (
              <Card key={l.id} className="hover:shadow-sm transition">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-zinc-500">{l.count} адресатов • {new Date(l.createdAt).toLocaleDateString("ru-RU")} • ID {l.id}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/lists/${l.id}`}><Button variant="outline" size="sm">Открыть</Button></Link>
                    <Button variant="ghost" size="sm" onClick={() => del(l.id)}>Удалить</Button>
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
