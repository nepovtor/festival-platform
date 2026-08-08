"use client";

import Image from "next/image";
import { useState } from "react";
import type { SiteContent } from "@/content/site-content";
import { adminFetch } from "@/lib/admin-csrf-client";

type PhotoManagerProps = {
  initialContent: SiteContent;
};

type UploadTarget = "hero" | "program" | number;

export function PhotoManager({ initialContent }: PhotoManagerProps) {
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState<UploadTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function upload(target: UploadTarget, file: File | undefined) {
    if (!file) return;
    setUploading(target);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await adminFetch("/api/admin/photos", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { message?: string; url?: string };
      if (!response.ok || !result.url) {
        setMessage(result.message ?? "Не удалось загрузить изображение.");
        return;
      }
      setContent((current) => {
        if (target === "hero") return { ...current, heroImage: result.url! };
        if (target === "program") return { ...current, programImage: result.url! };
        return {
          ...current,
          gallery: current.gallery.map((image, index) =>
            index === target ? { ...image, src: result.url! } : image,
          ),
        };
      });
      setMessage("Изображение загружено. Нажмите «Сохранить», чтобы применить его.");
    } catch {
      setMessage("Не удалось загрузить изображение.");
    } finally {
      setUploading(null);
    }
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
      setMessage(
        response.ok
          ? "Фотографии сохранены. Обновите лендинг, чтобы увидеть изменения."
          : (result.message ?? "Не удалось сохранить изменения."),
      );
    } catch {
      setMessage("Не удалось связаться с сервером.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="photo-manager" onSubmit={save}>
      <section className="photo-manager-intro">
        <p>Загрузите JPG, PNG или WebP размером до 6 МБ.</p>
        <p>
          Для пачки используйте PNG/WebP с прозрачным фоном. После загрузки
          нажмите «Сохранить изменения» внизу страницы.
        </p>
      </section>

      <section className="photo-manager-section">
        <h2>Визуалы нового дизайна</h2>
        <div className="photo-priority-grid">
          <PhotoCard
            label="Пачка Lay’s и декоративные pack-визуалы"
            src={content.heroImage}
            isUploading={uploading === "hero"}
            onChange={(file) => upload("hero", file)}
          />
          <PhotoCard
            label="Фото блока «О фестивале»"
            src={content.programImage}
            isUploading={uploading === "program"}
            onChange={(file) => upload("program", file)}
          />
        </div>
      </section>

      <section className="photo-manager-section">
        <h2>Карточки артистов и feature-фото</h2>
        <div className="photo-gallery-manager">
          {content.gallery.map((image, index) => (
            <PhotoCard
              key={index}
              label={
                index < 5
                  ? `Карточка артиста ${index + 1}`
                  : "Фото feature-блока"
              }
              src={image.src}
              alt={image.alt}
              isUploading={uploading === index}
              onAltChange={(alt) =>
                setContent((current) => ({
                  ...current,
                  gallery: current.gallery.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, alt } : item,
                  ),
                }))
              }
              onChange={(file) => upload(index, file)}
            />
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

function PhotoCard({
  label,
  src,
  alt,
  isUploading,
  onChange,
  onAltChange,
}: {
  label: string;
  src: string;
  alt?: string;
  isUploading: boolean;
  onChange: (file: File | undefined) => void;
  onAltChange?: (alt: string) => void;
}) {
  return (
    <article className="photo-card">
      <div className="photo-preview">
        <Image alt={alt ?? label} fill sizes="(max-width: 700px) 50vw, 30vw" src={src} unoptimized />
      </div>
      <div className="photo-card-body">
        <strong>{label}</strong>
        {onAltChange && (
          <input
            aria-label={`Описание: ${label}`}
            placeholder="Описание фотографии"
            value={alt}
            onChange={(event) => onAltChange(event.target.value)}
          />
        )}
        <label className="photo-upload">
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploading}
            onChange={(event) => onChange(event.target.files?.[0])}
            type="file"
          />
          {isUploading ? "Загружаем…" : "Заменить фото"}
        </label>
      </div>
    </article>
  );
}
