"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SuppressionPage() {
  const [list, setList] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  async function load() {
    const r = await fetch("/api/suppression");
    const d = await r.json();
    setList(d.list || []);
  }
  useEffect(() => { load(); }, []);
  async function add() {
    await fetch("/api/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setEmail(""); load();
  }
  async function del(e: string) {
    await fetch(`/api/suppression?email=${encodeURIComponent(e)}`, { method: "DELETE" });
    load();
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Отписки — suppression list</h1>
        <p className="text-sm text-zinc-500 mt-1">Каждый клик «отписаться» в письме попадает сюда. Будущие кампании автоматически пропускают эти адреса (статус <code className="bg-zinc-100 px-1 rounded">skipped</code>). Соответствует требованию ТЗ §6.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Добавить вручную</CardTitle>
          <p className="text-xs text-zinc-500">Например, если клиент попросил по телефону не писать — добавьте его email, и он не получит больше рассылок.</p>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add} disabled={!email.includes("@")}>Добавить</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Список ({list.length}) {list.length > 0 && <span className="text-xs font-normal text-zinc-500">— автоматически пополняется из писем</span>}</CardTitle></CardHeader>
        <CardContent>
          {list.length===0? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm text-zinc-600">Пока пусто — никто не отписался</p>
              <p className="text-xs text-zinc-500 mt-1">Ссылка отписки добавляется в каждое письмо автоматически (см. отправленные письма).</p>
            </div>
          ) : (
            <div className="overflow-auto rounded border">
              <table className="w-full text-sm"><thead className="bg-zinc-50"><tr className="text-left text-zinc-500"><th className="p-2">Email</th><th className="p-2">Причина</th><th className="p-2">Дата</th><th></th></tr></thead><tbody>{list.map((r:any)=><tr key={r.id} className="border-t hover:bg-zinc-50"><td className="p-2 font-mono text-xs">{r.email}</td><td className="p-2 text-xs">{r.reason}</td><td className="p-2 text-xs">{new Date(r.createdAt).toLocaleString("ru-RU")}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={()=>del(r.email)}>Удалить</Button></td></tr>)}</tbody></table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
