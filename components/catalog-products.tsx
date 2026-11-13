"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { CatalogProduct, StoreLocale } from "@/lib/catalog";
import type { UserRole } from "@/lib/access-control";

type Props = {
  locale: StoreLocale;
  initialProducts: CatalogProduct[];
  initialCursor: string | null;
  labels: {
    search: string;
    emptySearch: string;
    emptyProducts: string;
    addToOrder: string;
    orderDraft: string;
    deliveryCity: string;
    customerName: string;
    phoneNumber: string;
    deliveryAddress: string;
    placeOrder: string;
    signInToOrder: string;
    loadMore: string;
    orderPlaced: string;
    instagramLabel: string;
    instagramDescription: string;
    stock: string;
  };
};

const cities = [
  ["SAYED_SADIQ", "Sayed Sadiq"],
  ["HALABJA_TAZA", "Halabja Taza"],
  ["DARBANDIKHAN", "Darbandikhan"],
  ["SHARAZOOR", "Sharazoor"],
] as const;

export function CatalogProducts({ locale, initialProducts, initialCursor, labels }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [search, setSearch] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartProducts, setCartProducts] = useState<Record<string, CatalogProduct>>({});
  const [city, setCity] = useState<(typeof cities)[number][0]>("SAYED_SADIQ");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [message, setMessage] = useState("");
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const syncSession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      const accessToken = session?.access_token ?? null;
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
      if (result.profile?.city) setCity(result.profile.city);
    };

    supabase.auth.getSession()
      .then(({ data }) => syncSession(data.session))
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not read your sign-in."));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session).catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Could not verify your shop role.");
      });
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setProducts(initialProducts);
      setNextCursor(initialCursor);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ locale, limit: "50", q: query });
        const response = await fetch(`/api/products?${params}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not search products.");
        if (active) {
          setProducts(result.products);
          setNextCursor(result.nextCursor);
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not search products.");
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [initialCursor, initialProducts, locale, search]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      const specs = Object.entries(product.specifications ?? {}).map(([key, value]) => `${key} ${value}`).join(" ");
      return `${product.name} ${product.category} ${product.description ?? ""} ${specs}`.toLowerCase().includes(query);
    });
  }, [products, search]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ locale, limit: "50", cursor: nextCursor });
      const query = search.trim();
      if (query) params.set("q", query);
      const response = await fetch(`/api/products?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load more products.");
      setProducts((current) => [...current, ...result.products]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load more products.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !Object.keys(cart).length) return;
    setBusy(true);
    setMessage("");
    setCompletedOrderId(null);
    try {
      const profileResponse = await fetch("/api/users/me", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      const profileResult = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profileResult.error ?? "Could not save your delivery city.");

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          customerName,
          phoneNumber,
          deliveryAddress,
          items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not place your order.");
      setCart({});
      setCartProducts({});
      setCompletedOrderId(result.order.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not place your order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <label className="mb-5 flex items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/60">
        <span aria-hidden="true">⌕</span>
        <input
          aria-label={labels.search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={labels.search}
          className="w-full bg-transparent text-ink outline-none placeholder:text-ink/45"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {visibleProducts.length ? (
          visibleProducts.map((product, index) => (
            <article key={product.id} className="group min-w-0">
              <div className={`relative flex aspect-[4/4.5] items-center justify-center overflow-hidden rounded-2xl ${["bg-[#d9e2d4]", "bg-[#ead8c3]", "bg-[#e2dce9]", "bg-[#e9e5c9]"][index % 4]}`}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <div className="absolute h-36 w-36 rounded-full border border-white/60 transition-transform duration-500 group-hover:scale-125 sm:h-48 sm:w-48" />
                    <span className="relative px-4 text-center text-xl font-semibold text-forest/75 sm:text-2xl">{product.name}</span>
                  </>
                )}
              </div>
              <div className="flex items-start justify-between gap-2 px-1 pt-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="mt-1 text-xs text-ink/55">{product.category}</p>
                </div>
                <p dir="ltr" className="shrink-0 text-sm font-semibold">
                  {new Intl.NumberFormat(locale === "ckb" ? "ckb-IQ" : locale === "ar" ? "ar-IQ" : "en-US", { style: "currency", currency: product.currency }).format(product.priceCents / 100)}
                </p>
              </div>
              <p className="px-1 pt-1 text-xs text-ink/55">{labels.stock}: {product.stock}</p>
              {product.specifications && (
                <dl className="mt-2 space-y-1 px-1">
                  {Object.entries(product.specifications).map(([name, value]) => (
                    <div key={name} className="flex justify-between gap-2 text-xs">
                      <dt className="text-ink/55">{name}</dt>
                      <dd className="text-end font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {role === "SHOP_OWNER" ? (
                <button
                  type="button"
                  disabled={product.stock < 1 || (Object.keys(cart).length >= 50 && !cart[product.id])}
                  onClick={() => {
                    setCompletedOrderId(null);
                    setMessage("");
                    setCart((current) => ({
                      ...current,
                      [product.id]: Math.min(20, product.stock, (current[product.id] ?? 0) + 1),
                    }));
                    setCartProducts((current) => ({ ...current, [product.id]: product }));
                  }}
                  className="mt-3 w-full rounded-full border border-forest/20 px-3 py-2 text-xs font-semibold text-forest disabled:opacity-40"
                >
                  {labels.addToOrder}
                </button>
              ) : role === null ? (
                <Link href="/login" className="mt-3 block rounded-full border border-forest/20 px-3 py-2 text-center text-xs font-semibold text-forest">
                  {labels.signInToOrder}
                </Link>
              ) : null}
            </article>
          ))
        ) : (
          <p className="col-span-full rounded-2xl bg-white px-5 py-8 text-center text-sm text-ink/60">
            {search ? labels.emptySearch : labels.emptyProducts}
          </p>
        )}
      </div>

      {nextCursor && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
            {loadingMore ? "Loading…" : labels.loadMore}
          </button>
        </div>
      )}

      {role === "SHOP_OWNER" && Object.keys(cart).length > 0 && (
        <form onSubmit={placeOrder} className="mt-8 rounded-2xl bg-white p-5 sm:p-7">
          <h3 className="text-xl font-semibold">{labels.orderDraft} ({Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)})</h3>
          <ul className="mt-4 divide-y divide-ink/10">
            {Object.entries(cart).map(([id, quantity]) => {
              const product = products.find((item) => item.id === id) ?? cartProducts[id];
              if (!product) return null;
              return (
                <li key={id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>{product.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`${product.name} quantity`}
                      type="number"
                      min="1"
                      max={Math.min(20, product.stock)}
                      value={quantity}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isInteger(next) || next < 1) {
                          setCart((current) => {
                            const updated = { ...current };
                            delete updated[id];
                            return updated;
                          });
                          setCartProducts((current) => {
                            const updated = { ...current };
                            delete updated[id];
                            return updated;
                          });
                        } else {
                          setCart((current) => ({ ...current, [id]: Math.min(next, 20, product.stock) }));
                        }
                      }}
                      className="w-16 rounded-lg border border-ink/15 px-2 py-1.5"
                    />
                    <button type="button" onClick={() => {
                      setCart((current) => {
                        const updated = { ...current };
                        delete updated[id];
                        return updated;
                      });
                      setCartProducts((current) => {
                        const updated = { ...current };
                        delete updated[id];
                        return updated;
                      });
                    }} className="text-xs font-semibold text-red-700 underline">Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <label className="mt-4 block max-w-sm text-sm font-medium">{labels.deliveryCity}
            <select value={city} onChange={(event) => setCity(event.target.value as (typeof cities)[number][0])} className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5">
              {cities.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              {labels.customerName}
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-medium">
              {labels.phoneNumber}
              <input
                autoComplete="tel"
                type="tel"
                inputMode="tel"
                required
                maxLength={32}
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              {labels.deliveryAddress}
              <textarea
                autoComplete="street-address"
                required
                minLength={5}
                maxLength={500}
                rows={3}
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                className="mt-2 w-full resize-y rounded-xl border border-ink/15 px-3 py-2.5"
              />
            </label>
          </div>
          <button disabled={busy || !Object.keys(cart).length} className="mt-5 w-full rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">
            {busy ? "Placing order…" : labels.placeOrder}
          </button>
        </form>
      )}
      {completedOrderId && (
        <section role="status" className="mt-5 rounded-2xl border border-forest/10 bg-white p-5 sm:p-7">
          <h3 className="text-lg font-semibold">{labels.orderPlaced}</h3>
          <p className="mt-1 text-sm text-ink/65">Order {completedOrderId.slice(-8)}</p>
          <p className="mt-3 text-sm text-ink/65">{labels.instagramDescription}</p>
          <a
            href="https://www.instagram.com/fox_disgnn?rpxt=MXYxbWRzbzhxeHJ4Yw=="
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white"
          >
            {labels.instagramLabel}
          </a>
        </section>
      )}
      {message && <p role="status" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink/70">{message}</p>}
    </>
  );
}
