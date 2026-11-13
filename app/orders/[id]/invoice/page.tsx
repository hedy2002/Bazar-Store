"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Invoice = {
  id: string;
  status: string;
  currency: string;
  totalCents: number;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  deliveryCity: string;
  createdAt: string;
  retailer: { name: string | null; email: string };
  items: { productName: string; quantity: number; unitPriceCents: number }[];
};

const cities: Record<string, string> = {
  SAYED_SADIQ: "Sayed Sadiq",
  HALABJA_TAZA: "Halabja Taza",
  DARBANDIKHAN: "Darbandikhan",
  SHARAZOOR: "Sharazoor",
};

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("Loading invoice…");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sign in to view this invoice.");
        const response = await fetch(`/api/orders/${params.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load invoice.");
        if (active) {
          setInvoice(result.order);
          setError("");
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load invoice.");
      }
    }
    void load();
    return () => { active = false; };
  }, [params.id]);

  return (
    <main className="min-h-screen bg-cream px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/orders" className="text-sm font-semibold text-forest underline">← Your orders</Link>
          {invoice && (
            <button onClick={() => window.print()} className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white">
              Print / Save as PDF
            </button>
          )}
        </div>
        {error && <p role="status" className="rounded-2xl bg-white p-6 text-sm text-ink/65">{error}</p>}
        {invoice && (
          <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">
            <header className="flex flex-wrap justify-between gap-6 border-b border-ink/10 pb-6">
              <div>
                <p className="text-2xl font-black tracking-[-0.08em] text-forest">bazar.</p>
                <p className="mt-2 text-sm text-ink/55">Wholesale order invoice</p>
              </div>
              <div className="text-end">
                <h1 className="text-2xl font-semibold">Invoice</h1>
                <p className="mt-2 text-sm text-ink/60">Order {invoice.id}</p>
                <p className="mt-1 text-sm text-ink/60">{new Date(invoice.createdAt).toLocaleDateString()}</p>
              </div>
            </header>
            <section className="grid gap-5 py-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Retailer</p>
                <p className="mt-2 font-semibold">{invoice.customerName || invoice.retailer.name || invoice.retailer.email}</p>
                <p className="mt-1 text-sm text-ink/60">{invoice.retailer.email}</p>
                {invoice.phoneNumber && <p className="mt-1 text-sm text-ink/60">{invoice.phoneNumber}</p>}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Delivery</p>
                <p className="mt-2 font-semibold">{cities[invoice.deliveryCity]}</p>
                {invoice.deliveryAddress && <p className="mt-1 whitespace-pre-line text-sm text-ink/60">{invoice.deliveryAddress}</p>}
                <p className="mt-1 text-sm text-ink/60">Status: {invoice.status.replaceAll("_", " ")}</p>
              </div>
            </section>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="border-y border-ink/10 text-xs uppercase text-ink/50">
                  <tr><th className="py-3 pe-3">Item</th><th className="px-3 py-3 text-end">Qty</th><th className="px-3 py-3 text-end">Unit price</th><th className="py-3 ps-3 text-end">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {invoice.items.map((item, index) => (
                    <tr key={`${item.productName}-${index}`}>
                      <td className="py-3 pe-3">{item.productName}</td>
                      <td className="px-3 py-3 text-end">{item.quantity}</td>
                      <td className="px-3 py-3 text-end">{new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(item.unitPriceCents / 100)}</td>
                      <td className="py-3 ps-3 text-end">{new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(item.unitPriceCents * item.quantity / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ms-auto mt-5 flex max-w-xs justify-between border-t border-ink/10 pt-4 text-lg font-semibold">
              <span>Total</span>
              <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(invoice.totalCents / 100)}</span>
            </div>
            <p className="mt-10 border-t border-ink/10 pt-5 text-center text-xs text-ink/50">Thank you for your order.</p>
          </article>
        )}
      </div>
    </main>
  );
}
