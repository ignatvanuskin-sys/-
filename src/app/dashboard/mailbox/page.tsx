"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const presets: Record<string, { host: string; port: number; secure: boolean }> = {
  custom: { host: "", port: 587, secure: false },
  gmail: { host: "smtp.gmail.com", port: 587, secure: false },
  yandex: { host: "smtp.yandex.ru", port: 465, secure: true },
  mailru: { host: "smtp.mail.ru", port: 465, secure: true },
  outlook: { host: "smtp.office365.com", port: 587, secure: false },
};

export default function MailboxPage() {
  const [preset, setPreset] = useState("gmail");
  const [form, setForm] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    secure: false,
    login: "",
    password: "",
    fromName: "",
    fromEmail: "",
    replyTo: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    fetch("/api/mailbox").then((r) => r.json()).then((d) => {
      if (d.mailbox) {
        setForm({
          smtpHost: d.mailbox.smtpHost,
          smtpPort: d.mailbox.smtpPort,
          secure: d.mailbox.secure,
          login: d.mailbox.login,
          password: "",
          fromName: d.mailbox.fromName,
          fromEmail: d.mailbox.fromEmail,
          replyTo: d.mailbox.replyTo || "",
        });
        // detect preset
        for (const [k, v] of Object.entries(presets)) {
          if (v.host === d.mailbox.smtpHost) setPreset(k);
        }
        setTestTo(d.mailbox.fromEmail);
      }
    });
  }, []);

  function applyPreset(v: string) {
    setPreset(v);
    if (v !== "custom") {
      const p = presets[v];
      setForm((f) => ({ ...f, smtpHost: p.host, smtpPort: p.port, secure: p.secure }));
    }
  }

  async function save() {
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/mailbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) setErr(data.error);
    else setMsg("Сохранено");
  }

  async function test() {
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/mailbox/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testTo }) });
    const data = await res.json();
    if (!res.ok) setErr(data.error);
    else setMsg("Тестовое письмо отправлено на " + testTo);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Почтовый ящик</h1>
      <Card>
        <CardHeader>
          <CardTitle>SMTP подключение</CardTitle>
          <CardDescription>Подключите ящик, с которого будут уходить письма. Пароль хранится зашифрованным.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Пресет</Label>
            <Select value={preset} onChange={(e) => applyPreset(e.target.value)}>
              <option value="custom">Свой сервер</option>
              <option value="gmail">Gmail</option>
              <option value="yandex">Yandex</option>
              <option value="mailru">Mail.ru</option>
              <option value="outlook">Outlook</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP host</Label>
              <Input value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} id="secure" />
            <Label htmlFor="secure">SSL/TLS (465)</Label>
          </div>

          <div className="space-y-2">
            <Label>Login (email)</Label>
            <Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="you@gmail.com" />
          </div>
          <div className="space-y-2">
            <Label>Password / App Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="•••••••• (оставьте пустым чтобы не менять)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From name</Label>
              <Input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Иван Петров" />
            </div>
            <div className="space-y-2">
              <Label>From email</Label>
              <Input value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} placeholder="noreply@yourdomain.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reply-To (опционально)</Label>
            <Input value={form.replyTo} onChange={(e) => setForm({ ...form, replyTo: e.target.value })} />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-600">{msg}</p>}

          <div className="flex gap-2">
            <Button onClick={save}>Сохранить</Button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label>Тестовое письмо себе</Label>
            <div className="flex gap-2">
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="test@example.com" />
              <Button variant="outline" onClick={test}>Отправить тест</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
