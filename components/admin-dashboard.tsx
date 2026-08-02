"use client";

import { useMemo, useState } from "react";
import type { EmailCampaign, Registration } from "@/db/schema";
import { adminFetch } from "@/lib/admin-csrf-client";

type AdminDashboardProps = {
  registrations: Registration[];
  initialCampaigns: EmailCampaign[];
};

type SortKey = "createdAt" | "email" | "guestsCount" | "emailStatus";
type SortDirection = "asc" | "desc";

const emailStatusLabels = {
  PENDING: "Ожидает",
  SENT: "Отправлено",
  FAILED: "Ошибка",
} as const;

const campaignStatusLabels = {
  PENDING: "Ожидает",
  SENDING: "Отправляется",
  COMPLETED: "Завершена",
  PARTIAL: "Частично",
  FAILED: "Ошибка",
} as const;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function compareRows(a: Registration, b: Registration, sortKey: SortKey) {
  if (sortKey === "guestsCount") return a.guestsCount - b.guestsCount;
  return a[sortKey].localeCompare(b[sortKey], "ru", { sensitivity: "base" });
}

export function AdminDashboard({
  registrations,
  initialCampaigns,
}: AdminDashboardProps) {
  const [rows, setRows] = useState(registrations);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [tableMessage, setTableMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [broadcastConfirmed, setBroadcastConfirmed] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleRows = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (!normalizedQuery ||
              row.email.toLowerCase().includes(normalizedQuery)) &&
            (filter === "all" || row.emailStatus !== "SENT"),
        )
        .sort((a, b) => {
          const result = compareRows(a, b, sortKey);
          return sortDirection === "asc" ? result : -result;
        }),
    [filter, normalizedQuery, rows, sortDirection, sortKey],
  );

  const guestsTotal = rows
    .filter((item) => item.status === "CONFIRMED")
    .reduce((sum, item) => sum + item.guestsCount, 0);
  const average = rows.length > 0 ? guestsTotal / rows.length : 0;
  const attentionCount = rows.filter(
    (item) => item.emailStatus !== "SENT",
  ).length;
  const confirmedCount = rows.filter((item) => item.status === "CONFIRMED").length;

  function chooseSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "createdAt" ? "desc" : "asc");
  }

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  async function resendConfirmation(id: string) {
    setResendingId(id);
    setTableMessage("");
    try {
      const response = await adminFetch(
        `/api/admin/registrations/${encodeURIComponent(id)}/resend`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        message?: string;
        registration?: Registration | null;
      };
      if (result.registration) {
        setRows((current) =>
          current.map((row) =>
            row.id === result.registration?.id ? result.registration : row,
          ),
        );
      }
      setTableMessage(
        result.message ??
          (response.ok ? "Письмо отправлено." : "Не удалось отправить письмо."),
      );
    } catch {
      setTableMessage("Не удалось связаться с сервером.");
    } finally {
      setResendingId(null);
    }
  }

  async function sendBroadcast(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBroadcastMessage("");
    if (!broadcastConfirmed) {
      setBroadcastMessage("Подтвердите отправку рассылки.");
      return;
    }

    setIsBroadcasting(true);
    try {
      const response = await adminFetch("/api/admin/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          ...(ctaLabel ? { ctaLabel } : {}),
          ...(ctaUrl ? { ctaUrl } : {}),
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        campaign?: EmailCampaign;
      };
      setBroadcastMessage(
        result.message ??
          (response.ok ? "Рассылка завершена." : "Не удалось выполнить рассылку."),
      );
      if (result.campaign) {
        setCampaigns((current) => [
          result.campaign!,
          ...current.filter((item) => item.id !== result.campaign?.id),
        ]);
      }
      if (response.ok) {
        setSubject("");
        setMessage("");
        setCtaLabel("");
        setCtaUrl("");
        setBroadcastConfirmed(false);
      }
    } catch {
      setBroadcastMessage("Не удалось связаться с сервером.");
    } finally {
      setIsBroadcasting(false);
    }
  }

  return (
    <>
      <section className="admin-stats" aria-label="Статистика регистраций">
        <article>
          <span>Всего регистраций</span>
          <strong>{rows.length}</strong>
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
                Требуют внимания
              </button>
            </div>
            <a className="button admin-export" href="/api/admin/registrations.xlsx">
              Скачать XLSX
            </a>
          </div>
        </div>

        <div className="admin-table-meta">
          <span>Показано: {visibleRows.length}</span>
          <span aria-live="polite">{tableMessage}</span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => chooseSort("email")}>
                    Email{sortLabel("email")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => chooseSort("guestsCount")}>
                    Посетители{sortLabel("guestsCount")}
                  </button>
                </th>
                <th>Статус</th>
                <th>
                  <button type="button" onClick={() => chooseSort("emailStatus")}>
                    Письмо{sortLabel("emailStatus")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => chooseSort("createdAt")}>
                    Дата{sortLabel("createdAt")}
                  </button>
                </th>
                <th>Действие</th>
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
                  <td>{dateFormatter.format(new Date(row.createdAt))}</td>
                  <td>
                    <button
                      className="admin-row-action"
                      disabled={
                        resendingId === row.id || row.status !== "CONFIRMED"
                      }
                      onClick={() => resendConfirmation(row.id)}
                      type="button"
                    >
                      {resendingId === row.id ? "Отправляем…" : "Отправить письмо"}
                    </button>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td className="empty-table" colSpan={6}>
                    Регистрации не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-campaign-card" aria-labelledby="campaign-title">
        <div className="admin-campaign-heading">
          <div>
            <p className="eyebrow">Дополнительная рассылка</p>
            <h2 id="campaign-title">Написать гостям</h2>
          </div>
          <p>
            Письмо получат {confirmedCount} зарегистрированных адресатов.
            Результат каждой доставки сохранится в журнале.
          </p>
        </div>

        <form className="admin-campaign-form" onSubmit={sendBroadcast}>
          <label>
            Тема письма
            <input
              maxLength={160}
              onChange={(event) => setSubject(event.target.value)}
              required
              value={subject}
            />
          </label>
          <label className="admin-campaign-message-field">
            Сообщение
            <textarea
              maxLength={5000}
              onChange={(event) => setMessage(event.target.value)}
              required
              rows={7}
              value={message}
            />
          </label>
          <label>
            Текст кнопки (необязательно)
            <input
              maxLength={80}
              onChange={(event) => setCtaLabel(event.target.value)}
              value={ctaLabel}
            />
          </label>
          <label>
            Ссылка кнопки (необязательно)
            <input
              onChange={(event) => setCtaUrl(event.target.value)}
              placeholder="https://"
              type="url"
              value={ctaUrl}
            />
          </label>
          <label className="admin-campaign-confirm">
            <input
              checked={broadcastConfirmed}
              onChange={(event) => setBroadcastConfirmed(event.target.checked)}
              type="checkbox"
            />
            Подтверждаю отправку всем зарегистрированным посетителям
          </label>
          <div className="admin-campaign-submit">
            <p aria-live="polite">{broadcastMessage}</p>
            <button
              className="button"
              disabled={isBroadcasting || confirmedCount === 0}
              type="submit"
            >
              {isBroadcasting ? "Отправляем…" : "Начать рассылку"}
            </button>
          </div>
        </form>

        <div className="campaign-history">
          <h3>Последние рассылки</h3>
          {campaigns.length === 0 ? (
            <p>Рассылок пока не было.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Тема</th>
                    <th>Статус</th>
                    <th>Получатели</th>
                    <th>Отправлено</th>
                    <th>Ошибки</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>{campaign.subject}</td>
                      <td>{campaignStatusLabels[campaign.status]}</td>
                      <td>{campaign.recipientCount}</td>
                      <td>{campaign.sentCount}</td>
                      <td>{campaign.failedCount}</td>
                      <td>{dateFormatter.format(new Date(campaign.createdAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
