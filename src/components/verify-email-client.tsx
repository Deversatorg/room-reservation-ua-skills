"use client";

import { CheckCircle2, LoaderCircle, MailCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ApiErrorCode } from "@/lib/api";

type VerificationState = "waiting" | "verifying" | "verified" | "error";

export function VerifyEmailClient({ token }: { token?: string }) {
  const router = useRouter();
  const t = useTranslations("Verification");
  const tApi = useTranslations("ApiErrors");
  const [state, setState] = useState<VerificationState>(token ? "verifying" : "waiting");
  const [message, setMessage] = useState(
    token
      ? t("checking")
      : t("developmentLink"),
  );
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function verify() {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        });
        const data = (await response.json()) as { error?: { code?: ApiErrorCode } };
        if (!response.ok) {
          throw new Error(data.error?.code ? tApi(data.error.code) : t("failed"));
        }

        setState("verified");
        setMessage(t("verified"));
        router.refresh();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
        setMessage(error instanceof Error ? error.message : t("failed"));
      }
    }

    void verify();
    return () => controller.abort();
  }, [router, t, tApi, token]);

  async function resend() {
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = (await response.json()) as { error?: { code?: ApiErrorCode } };
      if (!response.ok) {
        throw new Error(data.error?.code ? tApi(data.error.code) : t("createLinkFailed"));
      }
      setState("waiting");
      setMessage(t("freshLink"));
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : t("createLinkFailed"));
    } finally {
      setResending(false);
    }
  }

  const Icon = state === "verified" ? CheckCircle2 : state === "verifying" ? LoaderCircle : MailCheck;

  return (
    <div>
      <span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon className={`size-6 ${state === "verifying" ? "animate-spin" : ""}`} />
      </span>
      <p className="mt-6 text-sm font-semibold text-indigo-600">{t("security")}</p>
      <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
        {state === "verified" ? t("verifiedTitle") : t("verifyTitle")}
      </h2>
      <p role="status" className={`mt-4 leading-7 ${state === "error" ? "text-rose-600" : "text-slate-500"}`}>
        {message}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {state === "verified" ? (
          <Link href="/schedule" className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">
            {t("openSchedule")}
          </Link>
        ) : (
          <button
            type="button"
            disabled={resending || state === "verifying"}
            onClick={() => void resend()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${resending ? "animate-spin" : ""}`} />
            {t("resend")}
          </button>
        )}
        <Link href="/schedule" className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-600">
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
