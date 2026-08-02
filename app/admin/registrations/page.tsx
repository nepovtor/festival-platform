import type { Metadata } from "next";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { listEmailCampaigns, listRegistrations } from "@/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Регистрации — Грибной фестиваль Lay’s",
  robots: { index: false, follow: false },
};

export default async function RegistrationsAdminPage() {
  const [rows, campaigns] = await Promise.all([
    listRegistrations(),
    listEmailCampaigns(),
  ]);

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
        <AdminLogoutButton />
      </header>
      <AdminDashboard
        initialCampaigns={campaigns}
        registrations={rows}
      />
    </main>
  );
}
