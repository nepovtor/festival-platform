import type { Metadata } from "next";
import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { PhotoManager } from "@/components/photo-manager";
import { getSiteContent } from "@/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Фотографии — Грибной фестиваль Lay’s",
  robots: { index: false, follow: false },
};

export default async function PhotosAdminPage() {
  const content = await getSiteContent();

  return (
    <main className="admin-page content-admin-page">
      <header className="admin-header">
        <div>
          <Link className="admin-back" href="/admin">
            ← В админку
          </Link>
          <p className="eyebrow">Панель организатора</p>
          <h1>Фотографии</h1>
        </div>
        <AdminLogoutButton />
      </header>
      <PhotoManager initialContent={content} />
    </main>
  );
}
