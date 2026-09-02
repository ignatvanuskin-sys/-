"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка входа");
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="admin@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} required placeholder="••••••••" className="pr-10" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2.5 text-xs text-zinc-500 hover:text-zinc-700">
            {show ? "скрыть" : "показать"}
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">Первый вход создаст админа автоматически (если DB пустая).</p>
      </div>
      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Входим..." : "Войти в панель"}
      </Button>
      <p className="text-xs text-center text-zinc-500">Демо: <code className="bg-zinc-100 px-1 rounded">admin@example.com / admin123</code> (из .env)</p>
    </form>
  );
}
