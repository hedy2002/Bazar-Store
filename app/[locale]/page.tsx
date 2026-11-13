import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogProducts, storeLocales, type StoreLocale } from "@/lib/catalog";
import { CustomItemRequestForm } from "@/components/custom-item-request-form";
import { CatalogProducts } from "@/components/catalog-products";

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
    emptySearch: string;
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
    footer: string;
  }
> = {
  en: {
    direction: "ltr",
    language: "English",
    announcement: "A little something good, delivered to your door.",
    search: "Search the store",
    cart: "Orders",
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
    emptySearch: "No products matched your search.",
    addToOrder: "Add to order",
    orderDraft: "Your order",
    deliveryCity: "Delivery city",
    customerName: "Full name",
    phoneNumber: "Phone number",
    deliveryAddress: "Delivery address and location (include street, area, or a nearby landmark)",
    placeOrder: "Place B2B order",
    signInToOrder: "Sign in to order",
    loadMore: "Load more products",
    orderPlaced: "Order placed",
    instagramLabel: "Visit Fox Design on Instagram",
    instagramDescription: "See more products and updates from Fox Design.",
    stock: "Stock",
    footer: "Thoughtful finds for everyday life.",
  },
  ar: {
    direction: "rtl",
    language: "العربية",
    announcement: "أشياء جميلة تصلك حتى باب بيتك.",
    search: "ابحث في المتجر",
    cart: "الطلبات",
    eyebrow: "أشياء جميلة من حولك",
    title: "أفسح المجال\nلما تحب.",
    description: "مجموعة مختارة بعناية من أساسيات الحياة اليومية، صُممت لتستخدمها وتحبها وتحتفظ بها.",
    shopNow: "تسوق المجموعة",
    curated: "اختيرت بعناية لحياتك اليومية",
    productsEyebrow: "اختياراتنا المميزة",
    collection: "اختياراتنا اليومية",
    viewAll: "عرض الكل",
    emptyProducts: "لا توجد منتجات متاحة بهذه اللغة بعد.",
    emptySearch: "لم يتم العثور على منتجات تطابق بحثك.",
    addToOrder: "أضف إلى الطلب",
    orderDraft: "طلبك",
    deliveryCity: "مدينة التوصيل",
    customerName: "الاسم الكامل",
    phoneNumber: "رقم الهاتف",
    deliveryAddress: "عنوان وموقع التوصيل (اذكر الشارع أو المنطقة أو معلماً قريباً)",
    placeOrder: "إرسال طلب البيع بالجملة",
    signInToOrder: "سجل الدخول للطلب",
    loadMore: "عرض منتجات أخرى",
    orderPlaced: "تم إرسال الطلب",
    instagramLabel: "زيارة Fox Design على إنستغرام",
    instagramDescription: "شاهد المزيد من المنتجات والتحديثات من Fox Design.",
    stock: "المخزون",
    footer: "اختيارات مميزة للحياة اليومية.",
  },
  ckb: {
    direction: "rtl",
    language: "کوردی",
    announcement: "شتێکی جوان، ڕاستەوخۆ بۆ دەرگای ماڵت.",
    search: "لە فرۆشگا بگەڕێ",
    cart: "داواکارییەکان",
    eyebrow: "شتە جوانەکان لە نزیکەوە",
    title: "شوێن بکەرەوە\nبۆ ئەوەی خۆشت دەوێت.",
    description: "کۆمەڵەیەک لە پێداویستییە ڕۆژانەکان، بە وریایی هەڵبژێردراون بۆ بەکارهێنان و خۆشویستن.",
    shopNow: "کۆمەڵەکە ببینە",
    curated: "بە وریایی بۆ ژیانی ڕۆژانە هەڵبژێردراوە",
    productsEyebrow: "باشترینەکان",
    collection: "هەڵبژاردە ڕۆژانەکان",
    viewAll: "هەمووی ببینە",
    emptyProducts: "هێشتا هیچ بەرهەمێک بەو زمانە بەردەست نییە.",
    emptySearch: "هیچ بەرهەمێک نەدۆزرایەوە کە لەگەڵ گەڕانەکەت بگونجێت.",
    addToOrder: "زیاد بکە بۆ داواکاری",
    orderDraft: "داواکارییەکەت",
    deliveryCity: "شاری گەیاندن",
    customerName: "ناوی تەواو",
    phoneNumber: "ژمارەی تەلەفۆن",
    deliveryAddress: "ناونیشان و شوێنی گەیاندن (شەقام، ناوچە یان شوێنێکی نزیک بنووسە)",
    placeOrder: "داواکاری کۆمەڵەیی بنێرە",
    signInToOrder: "بچۆ ژوورەوە بۆ داواکردن",
    loadMore: "بەرهەمی زیاتر ببینە",
    orderPlaced: "داواکاری نێردرا",
    instagramLabel: "Fox Design لە ئینستاگرام ببینە",
    instagramDescription: "بۆ بینینی بەرهەم و نوێکارییەکانی Fox Design سەردانی بکە.",
    stock: "کۆگا",
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
  const { products, nextCursor } = await getCatalogProducts(selectedLocale, undefined, 50);

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
          <Link href="/orders" className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold transition hover:bg-white">
            {copy.cart}
          </Link>
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

        <CatalogProducts
          locale={selectedLocale}
          initialProducts={products}
          initialCursor={nextCursor}
          labels={copy}
        />
      </section>

      <CustomItemRequestForm locale={selectedLocale} />

      <footer className="border-t border-ink/10 px-5 py-7 text-center text-xs text-ink/55 sm:px-8">
        © {new Date().getFullYear()} Bazar. {copy.footer}
      </footer>
    </main>
  );
}
