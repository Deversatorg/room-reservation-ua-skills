import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div>
      <p className="text-sm font-semibold text-indigo-600">Welcome back</p>
      <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
        Sign in to Roomly
      </h2>
      <p className="mt-3 text-slate-500">Your next meeting room is a few clicks away.</p>
      <AuthForm mode="login" />
    </div>
  );
}
