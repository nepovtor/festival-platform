"use client";

import { useState } from "react";
import type { FestivalFeature, ProgramContentItem, SiteContent } from "@/content/site-content";

type SiteEditorProps = {
  initialContent: SiteContent;
};

const emptyFeature: FestivalFeature = { title: "Новый блок", description: "Описание" };
const emptyProgramItem: ProgramContentItem = {
  time: "12:00",
  title: "Новый пункт программы",
  description: "Описание события",
  venue: "Площадка",
  category: "Программа",
};

export function SiteEditor({ initialContent }: SiteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateFestival(
    field: Exclude<keyof SiteContent["festival"], "features">,
    value: string,
  ) {
    setContent((current) => ({
      ...current,
      festival: { ...current.festival, [field]: value },
    }));
  }

  function updateFeature(
    index: number,
    field: keyof FestivalFeature,
    value: string,
  ) {
    setContent((current) => ({
      ...current,
      festival: {
        ...current.festival,
        features: current.festival.features.map((feature, featureIndex) =>
          featureIndex === index ? { ...feature, [field]: value } : feature,
        ),
      },
    }));
  }

  function updateProgram(
    index: number,
    field: keyof ProgramContentItem,
    value: string,
  ) {
    setContent((current) => ({
      ...current,
      program: current.program.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? "Не удалось сохранить изменения.");
        return;
      }
      setMessage("Сохранено. Обновите главную страницу, чтобы увидеть изменения.");
    } catch {
      setMessage("Не удалось связаться с сервером.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="site-editor" onSubmit={save}>
      <section className="editor-card">
        <div className="editor-card-heading">
          <div>
            <p className="editor-kicker">Главное</p>
            <h2>Фестиваль</h2>
          </div>
          <p>Эти данные отображаются в первом экране и блоке «О фестивале».</p>
        </div>
        <div className="editor-grid">
          <label>
            Название фестиваля
            <input
              value={content.festival.name}
              onChange={(event) => updateFestival("name", event.target.value)}
            />
          </label>
          <label>
            Дата
            <input
              value={content.festival.date}
              onChange={(event) => updateFestival("date", event.target.value)}
            />
          </label>
          <label>
            Время
            <input
              value={content.festival.time}
              onChange={(event) => updateFestival("time", event.target.value)}
            />
          </label>
          <label>
            Место проведения
            <input
              value={content.festival.place}
              onChange={(event) => updateFestival("place", event.target.value)}
            />
          </label>
          <label className="editor-full">
            Адрес или ориентир
            <input
              value={content.festival.address}
              onChange={(event) => updateFestival("address", event.target.value)}
            />
          </label>
          <label className="editor-full">
            Короткое описание
            <textarea
              rows={3}
              value={content.festival.description}
              onChange={(event) =>
                updateFestival("description", event.target.value)
              }
            />
          </label>
          <label className="editor-full">
            Текст блока «О фестивале»
            <textarea
              rows={5}
              value={content.festival.about}
              onChange={(event) => updateFestival("about", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="editor-card">
        <div className="editor-card-heading">
          <div>
            <p className="editor-kicker">Карточки</p>
            <h2>Блоки о фестивале</h2>
          </div>
          <button
            className="editor-add"
            type="button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                festival: {
                  ...current.festival,
                  features: [...current.festival.features, { ...emptyFeature }],
                },
              }))
            }
            disabled={content.festival.features.length >= 6}
          >
            + Добавить блок
          </button>
        </div>
        <div className="editor-repeat-grid">
          {content.festival.features.map((feature, index) => (
            <fieldset className="editor-repeat-card" key={index}>
              <legend>Блок {index + 1}</legend>
              <label>
                Заголовок
                <input
                  value={feature.title}
                  onChange={(event) =>
                    updateFeature(index, "title", event.target.value)
                  }
                />
              </label>
              <label>
                Описание
                <textarea
                  rows={3}
                  value={feature.description}
                  onChange={(event) =>
                    updateFeature(index, "description", event.target.value)
                  }
                />
              </label>
              <button
                className="editor-remove"
                type="button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    festival: {
                      ...current.festival,
                      features: current.festival.features.filter(
                        (_, featureIndex) => featureIndex !== index,
                      ),
                    },
                  }))
                }
                disabled={content.festival.features.length <= 1}
              >
                Удалить
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="editor-card">
        <div className="editor-card-heading">
          <div>
            <p className="editor-kicker">Расписание</p>
            <h2>Программа</h2>
          </div>
          <button
            className="editor-add"
            type="button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                program: [...current.program, { ...emptyProgramItem }],
              }))
            }
            disabled={content.program.length >= 12}
          >
            + Добавить событие
          </button>
        </div>
        <div className="editor-program-list">
          {content.program.map((item, index) => (
            <fieldset className="editor-program-item" key={index}>
              <legend>Событие {index + 1}</legend>
              <label>
                Время
                <input
                  value={item.time}
                  onChange={(event) =>
                    updateProgram(index, "time", event.target.value)
                  }
                />
              </label>
              <label>
                Название
                <input
                  value={item.title}
                  onChange={(event) =>
                    updateProgram(index, "title", event.target.value)
                  }
                />
              </label>
              <label>
                Категория
                <input
                  value={item.category}
                  onChange={(event) =>
                    updateProgram(index, "category", event.target.value)
                  }
                />
              </label>
              <label>
                Площадка
                <input
                  value={item.venue}
                  onChange={(event) =>
                    updateProgram(index, "venue", event.target.value)
                  }
                />
              </label>
              <label className="editor-program-description">
                Описание
                <textarea
                  rows={2}
                  value={item.description}
                  onChange={(event) =>
                    updateProgram(index, "description", event.target.value)
                  }
                />
              </label>
              <button
                className="editor-remove"
                type="button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    program: current.program.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
                disabled={content.program.length <= 1}
              >
                Удалить
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="editor-save-bar">
        <p aria-live="polite">{message}</p>
        <button className="button" disabled={isSaving} type="submit">
          {isSaving ? "Сохраняем…" : "Сохранить изменения"}
        </button>
      </div>
    </form>
  );
}
