import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const sess = await verifySessionToken(token);
  if (sess) redirect("/dashboard");
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow p-8 border">
          <h1 className="text-2xl font-bold mb-2">Вход в панель</h1>
          <p className="text-sm text-zinc-500 mb-6">Однопользовательский доступ. Введите email и пароль из .env</p>
          <LoginForm />
          <p className="text-xs text-zinc-400 mt-4">
            Первый запуск: если пользователя нет, он будет создан автоматически при входе. Установите ADMIN_EMAIL и ADMIN_PASSWORD в .env.
          </p>
        </div>
      </div>
    </div>
  );
}
