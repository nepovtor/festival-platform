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
          <Link className="admin-back" href="/">
            ← На сайт фестиваля
          </Link>
          <p className="eyebrow">Панель организатора</p>
          <h1>Регистрации</h1>
        </div>
        <div className="admin-header-actions">
          <Link className="admin-content-link" href="/admin/content">
            Редактировать сайт →
          </Link>
          <p className="admin-access-note">Доступ ограничен паролем</p>
        </div>
      </header>
      <AdminDashboard registrations={rows} />
    </main>
  );
}
