import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <div>
      <p className="text-sm font-semibold text-indigo-600">Get started</p>
      <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
        Create your account
      </h2>
      <p className="mt-3 text-slate-500">Book focused time for you and your team.</p>
      <AuthForm mode="register" />
    </div>
  );
}
