"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type RetailerOrder = {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  deliveryCity: string;
  createdAt: string;
};

const statuses: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

const cities: Record<string, string> = {
  SAYED_SADIQ: "Sayed Sadiq",
  HALABJA_TAZA: "Halabja Taza",
  DARBANDIKHAN: "Darbandikhan",
  SHARAZOOR: "Sharazoor",
};

export function RetailerOrders() {
  const [orders, setOrders] = useState<RetailerOrder[]>([]);
  const [message, setMessage] = useState("Loading your orders…");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (active) setMessage("Sign in to see order updates.");
          return;
        }
        const response = await fetch("/api/orders", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load orders.");
        if (active) {
          setOrders(result.orders);
          setMessage(result.orders.length ? "" : "You have not placed any orders yet.");
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load orders.");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10 sm:px-8">
      <Link href="/en" className="text-sm font-semibold text-forest underline">← Storefront</Link>
      <h1 className="mt-5 text-3xl font-semibold">Your orders</h1>
      {message && (
        <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-ink/70">
          {message} {message.startsWith("Sign in") && <Link href="/login" className="font-semibold text-forest underline">Sign in</Link>}
        </p>
      )}
      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5">
            <div>
              <p className="font-semibold">Order {order.id.slice(-8)}</p>
              <p className="mt-1 text-sm text-ink/55">
                {new Date(order.createdAt).toLocaleDateString()} · {cities[order.deliveryCity]}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-end">
                <p className="font-semibold">{new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency }).format(order.totalCents / 100)}</p>
                <p className="mt-1 text-xs text-ink/55">{statuses[order.status] ?? order.status}</p>
              </div>
              <Link href={`/orders/${order.id}/invoice`} className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold">Invoice</Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
