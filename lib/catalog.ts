import { prisma } from "@/lib/prisma";

export const storeLocales = ["en", "ar", "ckb"] as const;
export type StoreLocale = (typeof storeLocales)[number];

export type CatalogProduct = {
  id: string;
  slug: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  stock: number;
  name: string;
  description: string | null;
  category: string;
};

export async function getCatalogProducts(
  locale: StoreLocale,
  cursor: string | undefined,
  limit: number,
) {
  const rows = await prisma.product.findMany({
    where: {
      active: true,
      translations: { some: { locale } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    include: {
      translations: {
        where: { locale },
        select: { name: true, description: true, category: true },
      },
    },
  });

  const hasMore = rows.length > limit;
  const products: CatalogProduct[] = rows.slice(0, limit).map((product) => {
    const translation = product.translations[0];
    return {
      id: product.id,
      slug: product.slug,
      priceCents: product.priceCents,
      currency: product.currency,
      imageUrl: product.imageUrl,
      stock: product.stock,
      name: translation.name,
      description: translation.description,
      category: translation.category,
    };
  });

  return {
    products,
    nextCursor: hasMore ? products[products.length - 1].id : null,
  };
}
