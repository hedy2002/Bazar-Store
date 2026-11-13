import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <Link href="/en" className="text-2xl font-black tracking-[-0.08em] text-forest">bazar.</Link>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Sign in to Bazar</h1>
      <p className="mt-3 text-sm leading-6 text-ink/65">
        Shop owners sign in to browse and order. Store owners sign in to the Admin Dashboard using an email address authorized in the server&apos;s ADMIN_EMAILS setting.
      </p>
      <LoginForm />
    </main>
  );
}
