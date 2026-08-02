"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  registrationSchema,
  type RegistrationInput,
} from "@/lib/registration-schema";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function RegistrationForm() {
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: "",
      guestsCount: 1,
      consent: false,
      website: "",
    },
  });

  const submit = handleSubmit(async (values) => {
    setSubmission({ kind: "idle" });

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as {
        message?: string;
        emailDelivered?: boolean;
        fieldErrors?: Record<string, string[]>;
      };

      if (!response.ok) {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in values && messages[0]) {
              setError(field as keyof RegistrationInput, {
                message: messages[0],
              });
            }
          }
        }
        setSubmission({
          kind: "error",
          message: result.message ?? "Не удалось отправить форму.",
        });
        return;
      }

      setSubmission({
        kind: "success",
        message: result.emailDelivered
          ? "Спасибо за регистрацию!\nМы отправили подтверждение на указанную электронную почту.\nДо встречи на «Грибном фестивале Lay’s»!\nНе забудьте подготовить тематический образ — грибные костюмы и аксессуары только приветствуются и смогут участвовать в грибном дефиле!"
          : "Спасибо за регистрацию! Заявка сохранена. Письмо с подтверждением будет отправлено дополнительно.",
      });
      reset();
    } catch {
      setSubmission({
        kind: "error",
        message: "Не удалось отправить форму. Проверьте соединение и повторите.",
      });
    }
  });

  return (
    <form className="registration-form" onSubmit={submit} noValidate>
      <div className="form-field">
        <label htmlFor="registration-email">Email</label>
        <input
          id="registration-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="registration-guests">
          Сколько человек придёт, включая вас?
        </label>
        <select
          id="registration-guests"
          aria-invalid={Boolean(errors.guestsCount)}
          {...register("guestsCount", { valueAsNumber: true })}
        >
          {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
            <option value={count} key={count}>
              {count}
            </option>
          ))}
        </select>
        {errors.guestsCount && (
          <p className="field-error">{errors.guestsCount.message}</p>
        )}
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="registration-website">Ваш сайт</label>
        <input
          id="registration-website"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div className="consent-row">
        <input
          id="registration-consent"
          type="checkbox"
          aria-invalid={Boolean(errors.consent)}
          {...register("consent")}
        />
        <label htmlFor="registration-consent">
          Я согласен(на) на обработку данных и принимаю{" "}
          <a href="/privacy" target="_blank">
            политику конфиденциальности
          </a>
          .
        </label>
      </div>
      {errors.consent && (
        <p className="field-error consent-error">{errors.consent.message}</p>
      )}

      <button className="button form-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Отправляем…" : "Зарегистрироваться"}
        {!isSubmitting && <span aria-hidden="true">↗</span>}
      </button>

      <div
        className={`form-message ${submission.kind}`}
        aria-live="polite"
        role="status"
      >
        {submission.kind !== "idle" ? submission.message : ""}
      </div>
    </form>
  );
}
