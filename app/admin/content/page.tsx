import type { Metadata } from "next";
import Link from "next/link";
import { SiteEditor } from "@/components/site-editor";
import { getSiteContent } from "@/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Содержимое сайта — Город говорит",
  robots: { index: false, follow: false },
};

export default async function ContentAdminPage() {
  const content = await getSiteContent();

  return (
    <main className="admin-page content-admin-page">
      <header className="admin-header">
        <div>
          <Link className="admin-back" href="/admin/registrations">
            ← К регистрациям
          </Link>
          <p className="eyebrow">Панель организатора</p>
          <h1>Содержимое сайта</h1>
        </div>
        <p className="admin-access-note">Изменения сохраняются сразу</p>
      </header>
      <SiteEditor initialContent={content} />
    </main>
  );
}
