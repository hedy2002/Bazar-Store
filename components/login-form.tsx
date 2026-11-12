"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMessage("Check your email for a secure sign-in link.");
    } catch (error) {
      console.error("Could not send sign-in link.", error);
      setMessage(error instanceof Error ? error.message : "Could not send the sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-medium">
        Email address
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-forest"
        />
      </label>
      <button disabled={busy} className="w-full rounded-full bg-forest px-5 py-3 font-semibold text-white disabled:opacity-60">
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
      {message && <p role="status" className="text-sm text-ink/70">{message}</p>}
    </form>
  );
}
