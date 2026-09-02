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
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

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
    if (!form.login || !form.password || !form.fromEmail) {
      setErr("Заполните логин, пароль и From email");
      return;
    }
    setSaving(true);
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/mailbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) setErr(data.error);
    else setMsg("✅ Сохранено — пароль зашифрован (AES-256-GCM) и сохранён в БД");
  }

  async function createEthereal() {
    setMsg(null);
    setErr(null);
    setMsg("Создаём Ethereal тест-ящик...");
    const res = await fetch("/api/mailbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ethereal: true, fromName: form.fromName || "Ethereal Test", fromEmail: form.fromEmail || undefined }),
    });
    const data = await res.json();
    if (!res.ok) setErr(data.error);
    else {
      setMsg(data.info || "Ethereal ящик создан — тестовые письма бесплатны, смотрите логи");
      // reload
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
          setTestTo(d.mailbox.fromEmail);
        }
      });
    }
  }

  async function test() {
    if (!testTo || !testTo.includes("@")) {
      setErr("Укажите корректный email для теста");
      return;
    }
    setTesting(true);
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/mailbox/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testTo }) });
    const data = await res.json();
    setTesting(false);
    if (!res.ok) setErr(data.error);
    else {
      if (data.etherealPreviewUrl) setMsg(`Тестовое письмо отправлено! Ethereal preview: ${data.etherealPreviewUrl}`);
      else setMsg("Тестовое письмо отправлено на " + testTo + " — проверьте inbox и спам");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Почтовый ящик</h1>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <b>Подсказка:</b> Для Gmail нужен <b>App Password</b> (16 символов), не обычный пароль. Включите 2FA → myaccount.google.com → Пароли приложений. Для теста без Gmail — нажмите «Ethereal» ниже (бесплатно, 1 клик).
      </div>
      <Card>
        <CardHeader>
          <CardTitle>SMTP подключение</CardTitle>
          <CardDescription>Подключите ящик, с которого будут уходить письма. Пароль шифруется AES-256-GCM (ENCRYPTION_KEY) и не хранится в открытом виде.</CardDescription>
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

          {err && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 break-all">{err}</div>}
          {msg && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800 break-all">
              {msg.includes("https://") ? (
                <>
                  {msg.split("https://")[0]}
                  <a href={`https://${msg.split("https://")[1]}`} target="_blank" className="underline font-medium">
                    https://{msg.split("https://")[1]}
                  </a>
                </>
              ) : (
                msg
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={save} disabled={saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button>
            <Button variant="outline" onClick={createEthereal} disabled={saving}>🆓 Создать бесплатный тест-ящик (Ethereal)</Button>
          </div>
          <p className="text-xs text-zinc-500">Ethereal — бесплатный тестовый SMTP от Nodemailer. Не требует Gmail. Письма показываются по preview-ссылке (откройте её в новой вкладке). Идеально для проверки шаблона/уникализации без трат и без спам-риска.</p>

          <div className="border-t pt-4 space-y-2">
            <Label>Тестовое письмо себе</Label>
            <p className="text-xs text-zinc-500">Отправьте себе письмо, чтобы проверить, что SMTP работает. Для Ethereal — укажите любой email, письмо появится по preview-ссылке.</p>
            <div className="flex gap-2">
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="test@example.com" />
              <Button variant="outline" onClick={test} disabled={testing}>{testing ? "Отправляем..." : "Отправить тест"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
