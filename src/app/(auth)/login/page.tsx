import { AuthForm } from "@/components/auth-form";
import { getTranslations } from "next-intl/server";

export default async function LoginPage() {
  const t = await getTranslations("Auth");
  return (
    <div>
      <p className="text-sm font-semibold text-indigo-600">{t("loginEyebrow")}</p>
      <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
        {t("loginTitle")}
      </h2>
      <p className="mt-3 text-slate-500">{t("loginDescription")}</p>
      <AuthForm mode="login" />
    </div>
  );
}
