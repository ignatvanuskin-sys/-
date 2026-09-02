"use client";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <Button variant="outline" size="sm" onClick={logout} className="w-full">
      Выйти
    </Button>
  );
}
