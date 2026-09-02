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

  const [selected, setSelected] = useState<any>(null);
  if (!data) return <div className="p-8 text-center text-zinc-500">Загрузка кампании...</div>;
  if (data.error) return <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">{data.error}</div>;
  const c = data.campaign;
  const statusColor: Record<string, string> = { draft: "bg-zinc-100 text-zinc-700", running: "bg-blue-100 text-blue-700", paused: "bg-amber-100 text-amber-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
  const counts = data.recipients.reduce((acc: any, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as any);
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">{c.name} <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[c.status] || "bg-zinc-100"}`}>{c.status}</span></h1>
          <p className="text-xs text-zinc-500 mt-1">Автообновление каждые 3с • ID {c.id} • Создана {new Date(c.createdAt).toLocaleString("ru-RU")}</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>Экспорт CSV</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Параметры</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-zinc-100 rounded">Режим: <b>{c.mode}</b></span>
            <span className="px-2 py-1 bg-zinc-100 rounded">Уровень: {c.variationLevel}</span>
            <span className="px-2 py-1 bg-zinc-100 rounded">Задержка: {c.delayMinSec}-{c.delayMaxSec}с</span>
            <span className="px-2 py-1 bg-zinc-100 rounded">Лимит: {c.dailyLimit}/день</span>
            <span className="px-2 py-1 bg-zinc-100 rounded">Окно: {c.sendWindowStart||"—"}-{c.sendWindowEnd||"—"}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs pt-2 border-t mt-2">
            <span className="text-green-700">✅ sent {counts.sent || 0}</span>
            <span className="text-zinc-500">• queued {counts.queued || 0}</span>
            <span className="text-red-600">• error {counts.error || 0}</span>
            <span className="text-amber-600">• skipped {counts.skipped || 0}</span>
            <span className="text-purple-600">• unsubscribed {counts.unsubscribed || 0}</span>
          </div>
          <div className="pt-3 flex items-center gap-3">
            <Button size="sm" onClick={runBatch} disabled={loading}>{loading ? "Отправка..." : "▶ Отправить батч (fallback)"}</Button>
            <span className="text-xs text-zinc-500">Если Inngest не настроен — жмите пока очередь не опустеет. Задержка 10-90с соблюдается между письмами.</span>
          </div>
          <p className="text-[11px] text-zinc-400">💡 В логе ниже — реальный текст, ушедший каждому получателю (уникализация видна). Кликните по строке, чтобы увидеть полный текст.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Лог по получателям ({data.recipients.length}) — клик для просмотра</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50"><tr className="text-left text-zinc-500"><th className="p-2">ID</th><th className="p-2">Статус</th><th className="p-2">Тема</th><th className="p-2">Тело (превью)</th><th className="p-2">Ошибка</th></tr></thead>
              <tbody>
                {data.recipients.map((r: any) => (
                  <tr key={r.id} className="border-t hover:bg-zinc-50 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="p-2 font-mono text-xs">{r.id}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status==="sent"?"bg-green-100 text-green-700": r.status==="error"?"bg-red-100 text-red-700": r.status==="skipped"?"bg-zinc-100 text-zinc-600": r.status==="unsubscribed"?"bg-purple-100 text-purple-700": r.status==="queued"?"bg-amber-100 text-amber-700":"bg-zinc-100"}`}>{r.status}</span></td>
                    <td className="p-2 max-w-[200px] truncate text-xs" title={r.sentSubject||""}>{r.sentSubject||"—"}</td>
                    <td className="p-2 text-xs truncate max-w-[300px] text-zinc-600" title={r.sentBody||""}>{r.sentBody ? r.sentBody.slice(0,100).replace(/\n/g, " ") : "—"}</td>
                    <td className="p-2 text-xs text-red-600 truncate max-w-[150px]">{r.errorMessage||""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.recipients.length === 0 && <p className="text-sm text-zinc-500 mt-3">Получателей пока нет — проверьте, что список привязан.</p>}
        </CardContent>
      </Card>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-4">
              <h3 className="font-medium">Детали #{selected.id} — {selected.status}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>✕</Button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div><b>Тема:</b><div className="mt-1 p-2 bg-zinc-50 rounded border text-xs whitespace-pre-wrap">{selected.sentSubject || "—"}</div></div>
              <div><b>Тело:</b><div className="mt-1 p-3 bg-zinc-50 rounded border text-xs whitespace-pre-wrap max-h-64 overflow-auto">{selected.sentBody || "—"}</div></div>
              {selected.errorMessage && <div className="text-red-600"><b>Ошибка:</b> {selected.errorMessage}</div>}
              <div className="text-xs text-zinc-500">ID кампании {selected.campaignId} • получатель {selected.recipientId} • {selected.sentAt ? new Date(selected.sentAt).toLocaleString("ru-RU") : "не отправлено"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
