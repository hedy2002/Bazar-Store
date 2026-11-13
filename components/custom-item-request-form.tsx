"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { RetailerCity } from "@prisma/client";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/access-control";

type StoreLocale = "en" | "ar" | "ckb";

const cityLabels: Record<RetailerCity, string> = {
  SAYED_SADIQ: "Sayed Sadiq",
  HALABJA_TAZA: "Halabja Taza",
  DARBANDIKHAN: "Darbandikhan",
  SHARAZOOR: "Sharazoor",
};

const labels: Record<StoreLocale, {
  eyebrow: string;
  title: string;
  description: string;
  name: string;
  city: string;
  details: string;
  submit: string;
  sending: string;
  signIn: string;
}> = {
  en: {
    eyebrow: "NEED SOMETHING ELSE?",
    title: "Request a custom item",
    description: "Tell our wholesale team what you need. We’ll review it and follow up with you.",
    name: "Item name",
    city: "Delivery city",
    details: "Details (optional)",
    submit: "Send item request",
    sending: "Sending…",
    signIn: "Sign in as a retailer to submit a request.",
  },
  ar: {
    eyebrow: "هل تبحث عن شيء آخر؟",
    title: "اطلب منتجاً مخصصاً",
    description: "أخبر فريق البيع بالجملة بما تحتاجه. سنراجع طلبك ونتواصل معك.",
    name: "اسم المنتج",
    city: "مدينة التوصيل",
    details: "تفاصيل (اختياري)",
    submit: "إرسال طلب المنتج",
    sending: "جارٍ الإرسال…",
    signIn: "سجل الدخول بصفتك تاجر تجزئة لإرسال طلب.",
  },
  ckb: {
    eyebrow: "شتێکی تر پێویستتە؟",
    title: "داوای بەرهەمێکی تایبەت بکە",
    description: "بە تیمی فرۆشتنی کۆمەڵەیی بڵێ چی پێویستتە. داواکەت دەبینین و پەیوەندیت پێوە دەکەین.",
    name: "ناوی بەرهەم",
    city: "شاری گەیاندن",
    details: "وردەکاری (ئارەزوومەندانە)",
    submit: "داواکاری بنێرە",
    sending: "دەنێردرێت…",
    signIn: "وەک فرۆشیاری تاکەفرۆشی بچۆ ژوورەوە بۆ ناردنی داواکاری.",
  },
};

export function CustomItemRequestForm({ locale }: { locale: StoreLocale }) {
  const copy = labels[locale];
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [itemName, setItemName] = useState("");
  const [details, setDetails] = useState("");
  const [city, setCity] = useState<RetailerCity>("SAYED_SADIQ");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();
      const syncRole = async (accessToken: string | null) => {
        setToken(accessToken);
        setRole(null);
        if (!accessToken) return;
        const response = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not verify your shop role.");
        const result = await response.json();
        setRole(result.role === "STORE_OWNER" || result.role === "SHOP_OWNER" ? result.role : null);
      };
      supabase.auth.getSession()
        .then(({ data }) => syncRole(data.session?.access_token ?? null))
        .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not read your sign-in."));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        void syncRole(session?.access_token ?? null).catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : "Could not verify your shop role.");
        });
      });
      return () => listener.subscription.unsubscribe();
    } catch (error) {
      console.error("Could not initialize retailer sign-in.", error);
      setMessage("Sign-in is not configured yet.");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/item-requests", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ itemName, details, city }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send request.");
      setItemName("");
      setDetails("");
      setMessage("Your request has been sent to the Bazar team.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send request.");
    } finally {
      setBusy(false);
    }
  }

  if (role === "STORE_OWNER") return null;

  return (
    <section lang={locale} dir={locale === "en" ? "ltr" : "rtl"} className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
      <div className="rounded-3xl bg-white p-6 sm:p-9">
        <p className="text-xs font-bold tracking-[0.18em] text-forest">{copy.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{copy.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          {copy.description}
        </p>
        {token && role === "SHOP_OWNER" ? (
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {copy.name}
              <input
                required
                minLength={2}
                maxLength={120}
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-forest"
              />
            </label>
            <label className="text-sm font-medium">
              {copy.city}
              <select value={city} onChange={(event) => setCity(event.target.value as RetailerCity)} className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3">
                {Object.entries(cityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              {copy.details}
              <textarea
                maxLength={1000}
                rows={3}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-forest"
              />
            </label>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <button disabled={busy} className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? copy.sending : copy.submit}
              </button>
              {message && <p role="status" className="text-sm text-ink/70">{message}</p>}
            </div>
          </form>
        ) : token ? (
          <p className="mt-5 text-sm text-ink/70">Verifying account permissions…</p>
        ) : (
          <p className="mt-5 text-sm text-ink/70">
            <Link href="/login" className="font-semibold text-forest underline underline-offset-4">{copy.signIn}</Link>
            {message && <span className="ms-2">{message}</span>}
          </p>
        )}
      </div>
    </section>
  );
}
