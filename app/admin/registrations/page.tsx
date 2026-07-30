import type { Metadata } from "next";
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
          <p className="eyebrow">Панель организатора</p>
          <h1>Регистрации</h1>
        </div>
      </header>
      <AdminDashboard registrations={rows} />
    </main>
  );
}
