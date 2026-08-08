"use client";

import { MailWarning } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function EmailVerificationBanner() {
  const t = useTranslations("Verification");
  const tCommon = useTranslations("Common");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function resend() {
    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST" });
      setMessage(
        response.ok
          ? t("newLink")
          : t("newLinkFailed"),
      );
    } catch {
      setMessage(tCommon("serverUnavailable"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 text-sm sm:px-2 lg:px-4">
        <MailWarning className="size-4 shrink-0 text-amber-600" />
        <p>
          {t("banner")}
        </p>
        <div className="ml-auto flex items-center gap-3">
          {message && <span role="status" className="text-xs text-amber-700">{message}</span>}
          <Link href="/verify-email" className="font-semibold underline underline-offset-4">
            {t("page")}
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => void resend()}
            className="rounded-lg bg-amber-900 px-3 py-1.5 font-semibold text-white disabled:opacity-60"
          >
            {pending ? t("sending") : t("resend")}
          </button>
        </div>
      </div>
    </div>
  );
}
