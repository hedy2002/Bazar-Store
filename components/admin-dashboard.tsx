"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ItemRequestStatus, OrderStatus, RetailerCity } from "@prisma/client";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { AdminProductManager } from "@/components/admin-product-manager";

type AdminOrder = {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  deliveryCity: RetailerCity;
  createdAt: string;
  retailer: { name: string | null; email: string };
  profitCents: number;
};

type AdminItemRequest = {
  id: string;
  itemName: string;
  details: string | null;
  city: RetailerCity;
  status: ItemRequestStatus;
  createdAt: string;
  user: { name: string | null; email: string };
};

const cities: { value: RetailerCity; label: string }[] = [
  { value: "SAYED_SADIQ", label: "Sayed Sadiq" },
  { value: "HALABJA_TAZA", label: "Halabja Taza" },
  { value: "DARBANDIKHAN", label: "Darbandikhan" },
  { value: "SHARAZOOR", label: "Sharazoor" },
];

const orderStatuses: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
];

const requestStatuses: { value: ItemRequestStatus; label: string }[] = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "REVIEWING", label: "Reviewing" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
];

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [requests, setRequests] = useState<AdminItemRequest[]>([]);
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setEmail(data.session?.user.email ?? "");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      setEmail(session?.user.email ?? "");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const suffix = city ? `?city=${encodeURIComponent(city)}` : "";
      const headers = { Authorization: `Bearer ${token}` };
      const [orderResponse, requestResponse] = await Promise.all([
        fetch(`/api/admin/orders${suffix}`, { headers, cache: "no-store" }),
        fetch(`/api/admin/item-requests${suffix}`, { headers, cache: "no-store" }),
      ]);
      const [orderBody, requestBody] = await Promise.all([orderResponse.json(), requestResponse.json()]);
      if (!orderResponse.ok) throw new Error(orderBody.error ?? "Could not load orders.");
      if (!requestResponse.ok) throw new Error(requestBody.error ?? "Could not load item requests.");
      setOrders(orderBody.orders);
      setRequests(requestBody.requests);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load admin data.");
    }
  }, [city, token]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Import failed.");
      setNotice(`Imported ${result.imported} products.`);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function exportProducts(format: "csv" | "xlsx") {
    if (!token) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/products?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Export failed.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bazar-products.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    }
  }

  async function updateOrder(id: string, status: OrderStatus) {
    if (!token) return;
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Could not update order.");
    else await loadData();
  }

  async function updateRequest(id: string, status: ItemRequestStatus) {
    if (!token) return;
    const response = await fetch("/api/admin/item-requests", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Could not update request.");
    else await loadData();
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    setToken(null);
    setEmail("");
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link href="/en" className="text-2xl font-black tracking-[-0.08em] text-forest">bazar.</Link>
        <h1 className="mt-8 text-3xl font-semibold">Administrator sign in</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          <Link href="/login" className="font-semibold text-forest underline">Sign in with your administrator email</Link>.
          The email must be listed in the server&apos;s ADMIN_EMAILS environment variable.
        </p>
      </main>
    );
  }

  const totalSales = orders.reduce((total, order) => total + order.totalCents, 0);
  const totalsByCurrency = orders.reduce<Record<string, { sales: number; profit: number }>>((totals, order) => {
    const current = totals[order.currency] ?? { sales: 0, profit: 0 };
    current.sales += order.totalCents;
    current.profit += order.profitCents;
    totals[order.currency] = current;
    return totals;
  }, {});

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-6">
        <div>
          <Link href="/en" className="text-sm font-bold text-forest">← Storefront</Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Wholesale admin</h1>
          <p className="mt-1 text-sm text-ink/60">{email}</p>
        </div>
        <button onClick={signOut} className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold">Sign out</button>
      </header>

      <section className="mt-7 rounded-2xl bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Product import &amp; export</h2>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          Import up to 5,000 products per CSV or Excel file. Keep every translation column when updating stock or prices. Cost price is for admin profit calculations only.
        </p>
        <form onSubmit={upload} className="mt-5 flex flex-wrap items-center gap-3">
          <input required name="file" type="file" accept=".csv,.xlsx" className="max-w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-cream file:px-4 file:py-2" />
          <button disabled={busy} className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Importing…" : "Import / update"}
          </button>
          <button type="button" onClick={() => void exportProducts("csv")} className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold">Export CSV</button>
          <button type="button" onClick={() => void exportProducts("xlsx")} className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold">Export Excel</button>
          <a href="/products-import-template.csv" download className="text-sm font-semibold text-forest underline">Download template</a>
        </form>
        <p className="mt-3 text-xs text-ink/50">
          Headers: slug, priceCents, costPriceCents, stock, currency, imageUrl, active, then name/category/description columns for en, ar, and ckb. Prices are integer cents.
        </p>
      </section>

      <AdminProductManager token={token} />

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}

      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5">
          <p className="text-sm text-ink/60">Revenue in filtered orders</p>
          <div className="mt-2 space-y-1 text-2xl font-semibold">
            {Object.entries(totalsByCurrency).map(([currency, totals]) => <p key={currency}>{money(totals.sales, currency)}</p>)}
            {!Object.keys(totalsByCurrency).length && <p>{money(totalSales, "USD")}</p>}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5">
          <p className="text-sm text-ink/60">Gross product profit in filtered orders</p>
          <div className="mt-2 space-y-1 text-2xl font-semibold">
            {Object.entries(totalsByCurrency).map(([currency, totals]) => <p key={currency}>{money(totals.profit, currency)}</p>)}
            {!Object.keys(totalsByCurrency).length && <p>{money(0, "USD")}</p>}
          </div>
          <p className="mt-1 text-xs text-ink/50">Sales less recorded product cost; excludes delivery and other expenses.</p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Orders &amp; delivery routes</h2>
            <p className="mt-1 text-sm text-ink/60">Latest 200 orders. Filter by delivery city.</p>
          </div>
          <select aria-label="Filter by delivery city" value={city} onChange={(event) => setCity(event.target.value)} className="rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm">
            <option value="">All cities</option>
            {cities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase text-ink/55">
              <tr><th className="px-4 py-3">Order / customer</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Sales</th><th className="px-4 py-3">Gross profit</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Invoice</th></tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3"><p className="font-medium">{order.customerName || order.retailer.name || order.retailer.email}</p><p className="mt-1 text-xs text-ink/60">{order.phoneNumber || order.retailer.email}</p><p className="mt-1 text-xs text-ink/50">{new Date(order.createdAt).toLocaleDateString()} · {order.id.slice(-8)}</p></td>
                  <td className="max-w-64 whitespace-normal px-4 py-3"><p>{cities.find((item) => item.value === order.deliveryCity)?.label}</p><p className="mt-1 text-xs text-ink/60">{order.deliveryAddress || "Address not provided on legacy order"}</p></td>
                  <td className="px-4 py-3">{money(order.totalCents, order.currency)}</td>
                  <td className="px-4 py-3">{money(order.profitCents, order.currency)}</td>
                  <td className="px-4 py-3">
                    <select aria-label={`Status for order ${order.id}`} value={order.status} onChange={(event) => void updateOrder(order.id, event.target.value as OrderStatus)} className="rounded-lg border border-ink/15 bg-white px-2 py-2">
                      {orderStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><Link href={`/orders/${order.id}/invoice`} className="font-semibold text-forest underline">View / print</Link></td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/55">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 pb-16">
        <h2 className="text-2xl font-semibold">Custom item requests</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {requests.map((item) => (
            <article key={item.id} className="rounded-2xl bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.itemName}</h3>
                  <p className="mt-1 text-xs text-ink/55">{item.user.name || item.user.email} · {cities.find((option) => option.value === item.city)?.label}</p>
                </div>
                <select aria-label={`Status for ${item.itemName}`} value={item.status} onChange={(event) => void updateRequest(item.id, event.target.value as ItemRequestStatus)} className="rounded-lg border border-ink/15 bg-white px-2 py-2 text-sm">
                  {requestStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </div>
              {item.details && <p className="mt-3 whitespace-pre-wrap text-sm text-ink/70">{item.details}</p>}
            </article>
          ))}
          {!requests.length && <p className="rounded-2xl bg-white p-5 text-sm text-ink/55">No item requests yet.</p>}
        </div>
      </section>
    </main>
  );
}
