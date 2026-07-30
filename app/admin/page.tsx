import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Админка — Город говорит",
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return (
    <main className="admin-home">
      <section className="admin-home-card">
        <p className="eyebrow">Панель организатора</p>
        <h1>Управление фестивалем</h1>
        <p>
          Выберите раздел: посмотрите текущие регистрации или обновите
          содержимое сайта.
        </p>
        <nav className="admin-choice-grid" aria-label="Разделы админки">
          <Link className="admin-choice" href="/admin/registrations">
            <span>01</span>
            <strong>Статистика</strong>
            <small>Регистрации, гости, письма и CSV-выгрузка</small>
          </Link>
          <Link className="admin-choice admin-choice-accent" href="/admin/content">
            <span>02</span>
            <strong>Редактор сайта</strong>
            <small>Дата, тексты, карточки и программа фестиваля</small>
          </Link>
        </nav>
        <Link className="admin-public-link" href="/">
          ← Вернуться на сайт
        </Link>
      </section>
    </main>
  );
}
