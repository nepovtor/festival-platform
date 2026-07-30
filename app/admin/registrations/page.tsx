import type { Metadata } from "next";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin-dashboard";
import { listRegistrations } from "@/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Регистрации — Город говорит",
  robots: { index: false, follow: false },
};

export default async function RegistrationsAdminPage() {
  const rows = await listRegistrations();

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <Link className="admin-back" href="/admin">
            ← В админку
          </Link>
          <p className="eyebrow">Панель организатора</p>
          <h1>Регистрации</h1>
        </div>
        <p className="admin-access-note">Доступ ограничен паролем</p>
      </header>
      <AdminDashboard registrations={rows} />
    </main>
  );
}
