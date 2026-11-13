"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";

const locales = ["en", "ar", "ckb"] as const;
type Locale = (typeof locales)[number];
type ProductTranslation = {
  locale: Locale;
  name: string;
  category: string;
  description: string | null;
};
type AdminProduct = {
  id: string;
  slug: string;
  priceCents: number;
  costPriceCents: number;
  currency: string;
  imageUrl: string | null;
  specifications: Record<string, string | number | boolean> | null;
  stock: number;
  active: boolean;
  translations: ProductTranslation[];
};
type ProductForm = {
  slug: string;
  priceCents: string;
  costPriceCents: string;
  stock: string;
  currency: string;
  imageUrl: string;
  active: boolean;
  specifications: string;
  translations: Record<Locale, { name: string; category: string; description: string }>;
};

function emptyForm(): ProductForm {
  return {
    slug: "",
    priceCents: "0",
    costPriceCents: "0",
    stock: "0",
    currency: "USD",
    imageUrl: "",
    active: true,
    specifications: "",
    translations: {
      en: { name: "", category: "", description: "" },
      ar: { name: "", category: "", description: "" },
      ckb: { name: "", category: "", description: "" },
    },
  };
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function AdminProductManager({ token }: { token: string }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProducts = useCallback(async () => {
    const response = await fetch("/api/admin/products", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load products.");
    setProducts(result.products);
  }, [token]);

  useEffect(() => {
    void loadProducts().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load products.");
    });
  }, [loadProducts]);

  function editProduct(product: AdminProduct) {
    const translations = emptyForm().translations;
    for (const translation of product.translations) {
      translations[translation.locale] = {
        name: translation.name,
        category: translation.category,
        description: translation.description ?? "",
      };
    }
    setEditingId(product.id);
    setForm({
      slug: product.slug,
      priceCents: String(product.priceCents),
      costPriceCents: String(product.costPriceCents),
      stock: String(product.stock),
      currency: product.currency,
      imageUrl: product.imageUrl ?? "",
      active: product.active,
      specifications: product.specifications ? JSON.stringify(product.specifications, null, 2) : "",
      translations,
    });
    setError("");
    setNotice("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/products/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Image upload failed.");
      setForm((current) => ({ ...current, imageUrl: result.imageUrl }));
      setNotice("Product image uploaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...form,
        priceCents: Number(form.priceCents),
        costPriceCents: Number(form.costPriceCents),
        stock: Number(form.stock),
        imageUrl: form.imageUrl || null,
        specifications: form.specifications || null,
        translations: locales.map((locale) => ({ locale, ...form.translations[locale] })),
        ...(editingId ? { id: editingId } : {}),
      };
      const response = await fetch("/api/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save product.");
      setNotice(editingId ? "Product updated." : "Product created.");
      setEditingId(null);
      setForm(emptyForm());
      await loadProducts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!window.confirm(`Delete "${product.slug}"?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete product.");
      setNotice("Product deleted.");
      if (editingId === product.id) cancelEdit();
      await loadProducts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete product.");
    }
  }

  const filteredProducts = products.filter((product) => {
    const translationText = product.translations
      .map((translation) => `${translation.name} ${translation.category} ${translation.description ?? ""}`)
      .join(" ");
    const specificationText = Object.entries(product.specifications ?? {})
      .map(([key, value]) => `${key} ${value}`)
      .join(" ");
    return `${product.slug} ${translationText} ${specificationText}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <section className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
      <div className="rounded-2xl bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Products</h2>
            <p className="mt-1 text-sm text-ink/60">{products.length} catalog products</p>
          </div>
          <label className="text-sm">
            <span className="sr-only">Search admin products</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a product"
              className="w-full rounded-xl border border-ink/15 px-3 py-2 sm:w-56"
            />
          </label>
        </div>
        <div className="mt-4 max-h-[42rem] space-y-3 overflow-y-auto">
          {filteredProducts.map((product) => {
            const name = product.translations.find((item) => item.locale === "en")?.name ?? product.slug;
            return (
              <article key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-cream" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{name}</p>
                    <p className="text-xs text-ink/55">{product.slug} · stock {product.stock}</p>
                    <p className="text-xs text-forest">{formatPrice(product.priceCents, product.currency)}{!product.active ? " · hidden" : ""}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editProduct(product)} className="rounded-full border border-ink/15 px-3 py-2 text-sm font-semibold">Edit</button>
                  <button type="button" onClick={() => void deleteProduct(product)} className="rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Delete</button>
                </div>
              </article>
            );
          })}
          {!filteredProducts.length && <p className="py-6 text-center text-sm text-ink/55">No products match.</p>}
        </div>
      </div>

      <form onSubmit={saveProduct} className="rounded-2xl bg-white p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{editingId ? "Edit product" : "Add product"}</h2>
            <p className="mt-1 text-sm text-ink/60">Enter one translation per storefront language.</p>
          </div>
          {editingId && <button type="button" onClick={cancelEdit} className="text-sm font-semibold text-forest underline">Cancel</button>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm font-medium">Product slug
            <input required value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="usb-c-cable" className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium">Price (cents)
            <input required type="number" min="0" step="1" value={form.priceCents} onChange={(event) => setForm({ ...form, priceCents: event.target.value })} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium">Cost (cents)
            <input required type="number" min="0" step="1" value={form.costPriceCents} onChange={(event) => setForm({ ...form, costPriceCents: event.target.value })} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium">Stock
            <input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium">Currency
            <input required minLength={3} maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5" />
          </label>
          <label className="col-span-2 text-sm font-medium">Product image
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event)} disabled={busy} className="mt-2 block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-cream file:px-4 file:py-2" />
            <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="Or paste a public HTTPS image URL" className="mt-2 w-full rounded-xl border border-ink/15 px-3 py-2.5" />
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            Show this product in the storefront
          </label>
        </div>

        <div className="mt-6 space-y-4">
          {locales.map((locale) => (
            <fieldset key={locale} className="rounded-xl border border-ink/10 p-3">
              <legend className="px-1 text-sm font-semibold uppercase">{locale}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Name
                  <input required value={form.translations[locale].name} onChange={(event) => setForm({ ...form, translations: { ...form.translations, [locale]: { ...form.translations[locale], name: event.target.value } } })} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2" />
                </label>
                <label className="text-sm">Category
                  <input required value={form.translations[locale].category} onChange={(event) => setForm({ ...form, translations: { ...form.translations, [locale]: { ...form.translations[locale], category: event.target.value } } })} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2" />
                </label>
                <label className="text-sm sm:col-span-2">Description
                  <textarea rows={2} value={form.translations[locale].description} onChange={(event) => setForm({ ...form, translations: { ...form.translations, [locale]: { ...form.translations[locale], description: event.target.value } } })} className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2" />
                </label>
              </div>
            </fieldset>
          ))}
        </div>

        <label className="mt-5 block text-sm font-medium">Mobile accessory specifications (JSON)
          <textarea
            rows={5}
            value={form.specifications}
            onChange={(event) => setForm({ ...form, specifications: event.target.value })}
            placeholder={'{\n  "brand": "Example",\n  "model": "X1",\n  "compatibility": "USB-C devices",\n  "color": "Black"\n}'}
            className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-xs"
          />
        </label>
        <p className="mt-1 text-xs text-ink/55">Use text, number, or true/false values for properties such as brand, model, compatibility, connector, color, or warranty.</p>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Saving…" : editingId ? "Save changes" : "Add product"}
        </button>
      </form>
    </section>
  );
}
