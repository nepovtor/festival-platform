"use client";

import { useMemo, useState } from "react";
import type { Registration } from "@/db/schema";

type AdminDashboardProps = {
  registrations: Registration[];
};

const emailStatusLabels = {
  PENDING: "Ожидает",
  SENT: "Отправлено",
  FAILED: "Ошибка",
} as const;

export function AdminDashboard({ registrations }: AdminDashboardProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRows = useMemo(
    () =>
      normalizedQuery
        ? registrations.filter((row) =>
            row.email.toLowerCase().includes(normalizedQuery),
          )
        : registrations,
    [normalizedQuery, registrations],
  );

  const guestsTotal = registrations
    .filter((item) => item.status === "CONFIRMED")
    .reduce((sum, item) => sum + item.guestsCount, 0);
  const average =
    registrations.length > 0 ? guestsTotal / registrations.length : 0;

  return (
    <>
      <section className="admin-stats" aria-label="Статистика регистраций">
        <article>
          <span>Регистраций</span>
          <strong>{registrations.length}</strong>
        </article>
        <article>
          <span>Гостей ожидается</span>
          <strong>{guestsTotal}</strong>
        </article>
        <article>
          <span>Среднее в заявке</span>
          <strong>{average.toFixed(1)}</strong>
        </article>
      </section>

      <section className="admin-table-card">
        <div className="admin-toolbar">
          <label>
            <span className="sr-only">Поиск по email</span>
            <input
              type="search"
              placeholder="Поиск по email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <a className="button button-small" href="/api/admin/registrations.csv">
            Скачать CSV
          </a>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Посетители</th>
                <th>Регистрация</th>
                <th>Письмо</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.guestsCount}</td>
                  <td>
                    <span className={`status ${row.status.toLowerCase()}`}>
                      {row.status === "CONFIRMED" ? "Активна" : "Отменена"}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${row.emailStatus.toLowerCase()}`}>
                      {emailStatusLabels[row.emailStatus]}
                    </span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("ru-RU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(row.createdAt))}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td className="empty-table" colSpan={5}>
                    Регистрации не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
