import type { Metadata } from "next";
import Image from "next/image";
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
        <div className="admin-login-visual">
          <Image
            alt="Гости фестиваля у вечерней сцены"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 42vw"
            src="/images/evening-concert.webp"
          />
          <div className="admin-login-visual-copy">
            <span>Город говорит</span>
            <strong>Организаторская<br />панель</strong>
            <small>Управляйте фестивалем в одном месте</small>
          </div>
        </div>
        <div className="admin-login-content">
          <p className="eyebrow">Только для команды</p>
          <h1>С возвращением</h1>
          <p>Введите логин и пароль организатора, чтобы продолжить.</p>
          <AdminLoginForm returnTo={safeReturnTo} />
        </div>
      </section>
    </main>
  );
}
