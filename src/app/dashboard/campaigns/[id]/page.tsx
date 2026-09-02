"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CampaignDetail() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const r = await fetch(`/api/campaigns/${id}`);
    const d = await r.json();
    setData(d);
  }
  useEffect(() => { load(); const iv=setInterval(load, 3000); return()=>clearInterval(iv); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runBatch() {
    setLoading(true);
    const r = await fetch(`/api/campaigns/${id}/run`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) alert(d.error);
    setLoading(false);
    load();
  }
  function exportCsv() {
    if (!data?.recipients) return;
    const rows = data.recipients.map((r: any) => `${r.status},${r.sentSubject||""},${r.sentBody ? `"${r.sentBody.replace(/"/g,'""').slice(0,200)}"` : ""},${r.errorMessage||""}`).join("\n");
    const blob = new Blob(["status,subject,body,error\n"+rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`campaign-${id}.csv`; a.click();
  }

  if (!data) return <p>Загрузка...</p>;
  if (data.error) return <p className="text-red-600">{data.error}</p>;
  const c = data.campaign;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{c.name} <span className="text-sm font-normal px-2 py-1 bg-zinc-100 rounded">{c.status}</span></h1>
        <Button variant="outline" onClick={exportCsv}>Экспорт CSV</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Параметры</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>Режим: <b>{c.mode}</b> • уровень: {c.variationLevel}</div>
          <div>Задержка: {c.delayMinSec}-{c.delayMaxSec}с • лимит {c.dailyLimit}/день • окно {c.sendWindowStart||"—"}-{c.sendWindowEnd||"—"}</div>
          <div className="pt-2"><Button size="sm" onClick={runBatch} disabled={loading}>{loading?"Отправка...":"Отправить батч (fallback)"}</Button> <span className="text-xs text-zinc-500">Используйте если Inngest не настроен</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Лог по получателям ({data.recipients.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-zinc-500"><th className="p-2">ID</th><th className="p-2">Статус</th><th className="p-2">Тема (отправлено)</th><th className="p-2">Отправлено</th><th className="p-2">Ошибка</th></tr></thead>
              <tbody>
                {data.recipients.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.id}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${r.status==="sent"?"bg-green-100 text-green-700": r.status==="error"?"bg-red-100 text-red-700":"bg-zinc-100"}`}>{r.status}</span></td>
                    <td className="p-2 max-w-xs truncate" title={r.sentSubject||""}>{r.sentSubject||"—"}</td>
                    <td className="p-2 text-xs truncate max-w-xs" title={r.sentBody||""}>{r.sentBody ? r.sentBody.slice(0,120) : "—"}</td>
                    <td className="p-2 text-xs text-red-600">{r.errorMessage||""}</td>
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
