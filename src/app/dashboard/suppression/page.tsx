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
      <h1 className="text-2xl font-bold">Suppression list (отписки)</h1>
      <Card>
        <CardHeader><CardTitle>Добавить вручную</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          <Button onClick={add}>Добавить</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Список ({list.length})</CardTitle></CardHeader>
        <CardContent>
          {list.length===0? <p className="text-sm text-zinc-500">Пусто</p> :
            <table className="w-full text-sm"><thead><tr className="text-left text-zinc-500"><th className="p-2">Email</th><th className="p-2">Причина</th><th className="p-2">Дата</th><th></th></tr></thead><tbody>{list.map((r:any)=><tr key={r.id} className="border-t"><td className="p-2">{r.email}</td><td className="p-2">{r.reason}</td><td className="p-2">{new Date(r.createdAt).toLocaleString()}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={()=>del(r.email)}>Удалить</Button></td></tr>)}</tbody></table>
          }
        </CardContent>
      </Card>
    </div>
  );
}
