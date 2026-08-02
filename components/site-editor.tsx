"use client";

import { useState } from "react";
import type {
  FestivalFeature,
  ProgramContentItem,
  SiteContent,
} from "@/content/site-content";
import { adminFetch } from "@/lib/admin-csrf-client";

type SiteEditorProps = {
  initialContent: SiteContent;
};

const emptyFeature: FestivalFeature = {
  title: "Новый блок",
  description: "Описание",
};
const emptyProgramItem: ProgramContentItem = {
  time: "12:00",
  title: "Новое событие",
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
      const response = await adminFetch("/api/admin/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? "Не удалось сохранить изменения.");
        return;
      }
      setMessage("Изменения сохранены и уже появятся на сайте после обновления страницы.");
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
            <p className="editor-kicker">Первый экран и описание</p>
            <h2>Основная информация</h2>
          </div>
          <p>Нажмите на нужное значение и внесите правку.</p>
        </div>
        <div className="editor-table-wrap">
          <table className="editor-table">
            <tbody>
              <tr>
                <th scope="row">Название фестиваля</th>
                <td>
                  <input
                    value={content.festival.name}
                    onChange={(event) => updateFestival("name", event.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Дата</th>
                <td>
                  <input
                    value={content.festival.date}
                    onChange={(event) => updateFestival("date", event.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Время</th>
                <td>
                  <input
                    value={content.festival.time}
                    onChange={(event) => updateFestival("time", event.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Место проведения</th>
                <td>
                  <input
                    value={content.festival.place}
                    onChange={(event) => updateFestival("place", event.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Адрес / ориентир</th>
                <td>
                  <input
                    value={content.festival.address}
                    onChange={(event) =>
                      updateFestival("address", event.target.value)
                    }
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Короткое описание</th>
                <td>
                  <textarea
                    rows={3}
                    value={content.festival.description}
                    onChange={(event) =>
                      updateFestival("description", event.target.value)
                    }
                  />
                </td>
              </tr>
              <tr>
                <th scope="row">Текст «О фестивале»</th>
                <td>
                  <textarea
                    rows={5}
                    value={content.festival.about}
                    onChange={(event) => updateFestival("about", event.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="editor-card">
        <div className="editor-card-heading">
          <div>
            <p className="editor-kicker">Карточки на главной</p>
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
        <div className="editor-table-wrap">
          <table className="editor-table editor-repeat-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Заголовок</th>
                <th>Описание</th>
                <th aria-label="Удалить" />
              </tr>
            </thead>
            <tbody>
              {content.festival.features.map((feature, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      value={feature.title}
                      onChange={(event) =>
                        updateFeature(index, "title", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <textarea
                      rows={2}
                      value={feature.description}
                      onChange={(event) =>
                        updateFeature(index, "description", event.target.value)
                      }
                    />
                  </td>
                  <td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="editor-card">
        <div className="editor-card-heading">
          <div>
            <p className="editor-kicker">Расписание</p>
            <h2>Программа фестиваля</h2>
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
            disabled={content.program.length >= 24}
          >
            + Добавить событие
          </button>
        </div>
        <div className="editor-table-wrap">
          <table className="editor-table editor-program-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Площадка</th>
                <th>Описание</th>
                <th aria-label="Удалить" />
              </tr>
            </thead>
            <tbody>
              {content.program.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      value={item.time}
                      onChange={(event) =>
                        updateProgram(index, "time", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={item.title}
                      onChange={(event) =>
                        updateProgram(index, "title", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={item.category}
                      onChange={(event) =>
                        updateProgram(index, "category", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={item.venue}
                      onChange={(event) =>
                        updateProgram(index, "venue", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(event) =>
                        updateProgram(index, "description", event.target.value)
                      }
                    />
                  </td>
                  <td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
