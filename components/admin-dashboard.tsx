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
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRows = useMemo(
    () =>
      registrations.filter(
        (row) =>
          (!normalizedQuery || row.email.toLowerCase().includes(normalizedQuery)) &&
          (filter === "all" || row.emailStatus !== "SENT"),
      ),
    [filter, normalizedQuery, registrations],
  );

  const guestsTotal = registrations
    .filter((item) => item.status === "CONFIRMED")
    .reduce((sum, item) => sum + item.guestsCount, 0);
  const average =
    registrations.length > 0 ? guestsTotal / registrations.length : 0;
  const attentionCount = registrations.filter(
    (item) => item.emailStatus !== "SENT",
  ).length;

  return (
    <>
      <section className="admin-stats" aria-label="Статистика регистраций">
        <article>
          <span>Всего регистраций</span>
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
        <article className={attentionCount > 0 ? "needs-attention" : ""}>
          <span>Письма требуют внимания</span>
          <strong>{attentionCount}</strong>
        </article>
      </section>

      <section className="admin-table-card">
        <div className="admin-toolbar">
          <label>
            <span className="sr-only">Поиск по email</span>
            <input
              type="search"
              placeholder="Найти по email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="admin-actions">
            <div className="admin-filters" aria-label="Фильтр регистраций">
              <button
                className={filter === "all" ? "is-active" : ""}
                type="button"
                onClick={() => setFilter("all")}
              >
                Все
              </button>
              <button
                className={filter === "attention" ? "is-active" : ""}
                type="button"
                onClick={() => setFilter("attention")}
              >
                Внимание
              </button>
            </div>
            <a className="button admin-export" href="/api/admin/registrations.xlsx">
              Скачать Excel
            </a>
          </div>
        </div>

        <div className="admin-table-meta">
          <span>Показано: {visibleRows.length}</span>
          <span>Обновляется при открытии страницы</span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Посетители</th>
                <th>Статус</th>
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
                      {row.status === "CONFIRMED" ? "Подтверждена" : "Отменена"}
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
