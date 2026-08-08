"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import type { ApiErrorCode } from "@/lib/api";

type ApiError = {
  error?: { code?: ApiErrorCode; message?: string; fieldErrors?: Record<string, string[]> };
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const t = useTranslations("Auth");
  const tApi = useTranslations("ApiErrors");
  const tValidation = useTranslations("Validation");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = (await response.json()) as ApiError;

      if (!response.ok) {
        setMessage(data.error?.code ? tApi(data.error.code) : t("somethingWrong"));
        const errors = data.error?.fieldErrors;
        setFieldErrors({
          ...(errors?.name ? { name: [tValidation("name")] } : {}),
          ...(errors?.email ? { email: [tValidation("email")] } : {}),
          ...(errors?.password ? { password: [tValidation("password")] } : {}),
        });
        return;
      }

      router.push(isRegister ? "/verify-email" : "/schedule");
      router.refresh();
    } catch {
      setMessage(tApi("SERVER_ERROR"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
      {isRegister && (
        <Field
          label={t("fullName")}
          name="name"
          placeholder={t("fullNamePlaceholder")}
          autoComplete="name"
          error={fieldErrors.name?.[0]}
        />
      )}
      <Field
        label={t("workEmail")}
        name="email"
        type="email"
        placeholder="alex@company.com"
        autoComplete="email"
        error={fieldErrors.email?.[0]}
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        placeholder={isRegister ? t("newPasswordPlaceholder") : t("passwordPlaceholder")}
        autoComplete={isRegister ? "new-password" : "current-password"}
        error={fieldErrors.password?.[0]}
      />

      {message && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <>
            {isRegister ? t("createAccount") : t("signIn")}
            <ArrowRight className="size-4" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-slate-500">
        {isRegister ? t("alreadyRegistered") : t("newToRoomly")}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {isRegister ? t("signIn") : t("createAccount")}
        </Link>
      </p>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  autoComplete: string;
  error?: string;
};

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  error,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-rose-100"
      />
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
