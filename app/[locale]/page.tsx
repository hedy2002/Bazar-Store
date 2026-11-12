import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogProducts, storeLocales, type StoreLocale } from "@/lib/catalog";
import { CustomItemRequestForm } from "@/components/custom-item-request-form";

const locales = storeLocales;

const content: Record<
  StoreLocale,
  {
    direction: "ltr" | "rtl";
    language: string;
    announcement: string;
    search: string;
    cart: string;
    eyebrow: string;
    title: string;
    description: string;
    shopNow: string;
    curated: string;
    productsEyebrow: string;
    collection: string;
    viewAll: string;
    emptyProducts: string;
    footer: string;
  }
> = {
  en: {
    direction: "ltr",
    language: "English",
    announcement: "A little something good, delivered to your door.",
    search: "Search the store",
    cart: "Bag",
    eyebrow: "GOOD THINGS, CLOSE TO HOME",
    title: "Make room for\nthings you love.",
    description:
      "A thoughtful collection of everyday essentials, made to be used, loved, and kept.",
    shopNow: "Shop the collection",
    curated: "Curated for everyday",
    productsEyebrow: "THE GOOD STUFF",
    collection: "Everyday favourites",
    viewAll: "View all",
    emptyProducts: "No products are available in this language yet.",
    footer: "Thoughtful finds for everyday life.",
  },
  ar: {
    direction: "rtl",
    language: "العربية",
    announcement: "أشياء جميلة تصلك حتى باب بيتك.",
    search: "ابحث في المتجر",
    cart: "السلة",
    eyebrow: "أشياء جميلة من حولك",
    title: "أفسح المجال\nلما تحب.",
    description: "مجموعة مختارة بعناية من أساسيات الحياة اليومية، صُممت لتستخدمها وتحبها وتحتفظ بها.",
    shopNow: "تسوق المجموعة",
    curated: "اختيرت بعناية لحياتك اليومية",
    productsEyebrow: "اختياراتنا المميزة",
    collection: "اختياراتنا اليومية",
    viewAll: "عرض الكل",
    emptyProducts: "لا توجد منتجات متاحة بهذه اللغة بعد.",
    footer: "اختيارات مميزة للحياة اليومية.",
  },
  ckb: {
    direction: "rtl",
    language: "کوردی",
    announcement: "شتێکی جوان، ڕاستەوخۆ بۆ دەرگای ماڵت.",
    search: "لە فرۆشگا بگەڕێ",
    cart: "سەبەتە",
    eyebrow: "شتە جوانەکان لە نزیکەوە",
    title: "شوێن بکەرەوە\nبۆ ئەوەی خۆشت دەوێت.",
    description: "کۆمەڵەیەک لە پێداویستییە ڕۆژانەکان، بە وریایی هەڵبژێردراون بۆ بەکارهێنان و خۆشویستن.",
    shopNow: "کۆمەڵەکە ببینە",
    curated: "بە وریایی بۆ ژیانی ڕۆژانە هەڵبژێردراوە",
    productsEyebrow: "باشترینەکان",
    collection: "هەڵبژاردە ڕۆژانەکان",
    viewAll: "هەمووی ببینە",
    emptyProducts: "هێشتا هیچ بەرهەمێک بەو زمانە بەردەست نییە.",
    footer: "شتە جوانەکان بۆ ژیانی ڕۆژانە.",
  },
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as StoreLocale)) notFound();

  const selectedLocale = locale as StoreLocale;
  const copy = content[selectedLocale];
  const { products } = await getCatalogProducts(selectedLocale, undefined, 8);
  const numberLocale = selectedLocale === "ckb" ? "ckb-IQ" : selectedLocale === "ar" ? "ar-IQ" : "en-US";

  return (
    <main lang={selectedLocale} dir={copy.direction} className="min-h-screen">
      <div className="bg-forest px-4 py-2 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
        {copy.announcement}
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href={`/${selectedLocale}`} className="text-2xl font-black tracking-[-0.08em] text-forest">
          bazar<span className="text-lime">.</span>
        </Link>

        <nav aria-label="Language" className="flex items-center gap-1 rounded-full bg-white p-1 text-xs font-semibold shadow-sm">
          {locales.map((option) => (
            <Link
              key={option}
              href={`/${option}`}
              hrefLang={option}
              aria-current={option === selectedLocale ? "page" : undefined}
              className={`rounded-full px-3 py-2 transition ${
                option === selectedLocale ? "bg-forest text-white" : "text-ink/60 hover:text-ink"
              }`}
            >
              {content[option].language}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/orders" className="hidden text-sm font-semibold text-ink/70 hover:text-forest sm:inline">
            Orders
          </Link>
          <Link href="/login" className="hidden text-sm font-semibold text-ink/70 hover:text-forest sm:inline">
            Sign in
          </Link>
          <label className="hidden items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-ink/50 md:flex">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label={copy.search}
              placeholder={copy.search}
              className="w-32 bg-transparent outline-none placeholder:text-ink/45"
            />
          </label>
          <button type="button" className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold transition hover:bg-white">
            {copy.cart} <span className="text-forest">· 0</span>
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-14 pt-5 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-20 md:pt-10">
        <div className="py-6 md:py-12">
          <p className="mb-5 text-xs font-bold tracking-[0.2em] text-forest">{copy.eyebrow}</p>
          <h1 className="max-w-2xl whitespace-pre-line text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-ink/65 sm:text-lg">
            {copy.description}
          </p>
          <a
            href="#collection"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#164535]"
          >
            {copy.shopNow}
            <span aria-hidden="true">{copy.direction === "rtl" ? "←" : "→"}</span>
          </a>
        </div>

        <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] bg-[#dfe8d8] sm:min-h-[390px]">
          <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full border-[1px] border-forest/15 sm:h-80 sm:w-80" />
          <div className="absolute -bottom-28 -right-10 h-72 w-72 rounded-full border-[1px] border-forest/15 sm:h-96 sm:w-96" />
          <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] items-center justify-center rounded-[42%] bg-lime shadow-[0_24px_60px_rgba(29,89,71,0.18)] sm:h-64 sm:w-64">
            <span className="text-center text-6xl font-black tracking-[-0.08em] text-forest sm:text-8xl">
              bazar<span className="text-white">.</span>
            </span>
          </div>
          <div className="absolute bottom-5 left-5 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-forest backdrop-blur">
            {copy.curated}
          </div>
        </div>
      </section>

      <section id="collection" className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.18em] text-forest">{copy.productsEyebrow}</p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{copy.collection}</h2>
          </div>
          <a href="#collection" className="text-sm font-semibold text-forest underline decoration-forest/30 underline-offset-4">
            {copy.viewAll}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.length ? (
            products.map((product, index) => (
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
                    {new Intl.NumberFormat(numberLocale, { style: "currency", currency: product.currency }).format(product.priceCents / 100)}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p className="col-span-full rounded-2xl bg-white px-5 py-8 text-center text-sm text-ink/60">
              {copy.emptyProducts}
            </p>
          )}
        </div>
      </section>

      <CustomItemRequestForm locale={selectedLocale} />

      <footer className="border-t border-ink/10 px-5 py-7 text-center text-xs text-ink/55 sm:px-8">
        © {new Date().getFullYear()} Bazar. {copy.footer}
      </footer>
    </main>
  );
}
