"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ListDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  async function load() {
    const r = await fetch(`/api/lists/${id}`);
    const d = await r.json();
    setData(d);
  }
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function add() {
    const r = await fetch(`/api/lists/${id}/recipients`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, company }) });
    const d = await r.json();
    if (!r.ok) alert(d.error);
    else { setEmail(""); setName(""); setCompany(""); load(); }
  }
  async function del(recipientId: number) {
    await fetch(`/api/lists/${id}/recipients?recipientId=${recipientId}`, { method: "DELETE" });
    load();
  }
  function exportCsv() {
    if (!data?.recipients) return;
    const rows = data.recipients.map((r: any) => `${r.email},${r.name||""},${r.company||""}`).join("\n");
    const blob = new Blob(["email,name,company\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `list-${id}.csv`; a.click();
  }

  if (!data) return <p>Загрузка...</p>;
  if (data.error) return <p className="text-red-600">{data.error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{data.list.name}</h1>
        <Button variant="outline" onClick={exportCsv}>Экспорт CSV</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Добавить вручную</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <div className="space-y-1"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="a@b.com" /></div>
          <div className="space-y-1"><Label>Имя</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>Компания</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
          <Button onClick={add} className="self-end">Добавить</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Получатели ({data.recipients.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-zinc-500"><th className="p-2">Email</th><th className="p-2">Имя</th><th className="p-2">Компания</th><th className="p-2"></th></tr></thead>
              <tbody>
                {data.recipients.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.email}</td><td className="p-2">{r.name||""}</td><td className="p-2">{r.company||""}</td>
                    <td className="p-2"><Button variant="ghost" size="sm" onClick={() => del(r.id)}>Удалить</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
