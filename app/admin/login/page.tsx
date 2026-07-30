import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = {
  title: "Вход в админку — Город говорит",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to: returnTo } = await searchParams;
  const safeReturnTo =
    returnTo?.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/admin";

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p className="eyebrow">Панель организатора</p>
        <h1>Вход в админку</h1>
        <p>Введите данные организатора, чтобы управлять фестивалем.</p>
        <AdminLoginForm returnTo={safeReturnTo} />
      </section>
    </main>
  );
}
