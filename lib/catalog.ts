import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const storeLocales = ["en", "ar", "ckb"] as const;
export type StoreLocale = (typeof storeLocales)[number];

export type CatalogProduct = {
  id: string;
  slug: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  specifications: Record<string, string | number | boolean> | null;
  stock: number;
  name: string;
  description: string | null;
  category: string;
};

function getSpecifications(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entries = Object.entries(value);
  if (entries.some(([, item]) => !["string", "number", "boolean"].includes(typeof item))) {
    return null;
  }
  return Object.fromEntries(entries) as Record<string, string | number | boolean>;
}

export async function getCatalogProducts(
  locale: StoreLocale,
  cursor: string | undefined,
  limit: number,
  search?: string,
) {
  if (!prisma) return { products: [], nextCursor: null };

  try {
    const query = search?.trim() ?? "";
    const rows = await prisma.product.findMany({
      where: {
        active: true,
        translations: { some: { locale } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(!query && cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      ...(!query ? { take: limit + 1 } : {}),
      include: {
        translations: {
          where: { locale },
          select: { name: true, description: true, category: true },
        },
      },
    });

    const matchingRows = query
      ? rows.filter((product) => {
          const translation = product.translations[0];
          const specs = product.specifications && typeof product.specifications === "object"
            ? Object.entries(product.specifications).map(([key, value]) => `${key} ${String(value)}`).join(" ")
            : "";
          return `${translation?.name ?? ""} ${translation?.category ?? ""} ${translation?.description ?? ""} ${specs}`
            .toLowerCase()
            .includes(query.toLowerCase());
        })
      : rows;
    const cursorPosition = query && cursor
      ? matchingRows.findIndex((product) => product.id === cursor)
      : -1;
    const cursorIndex = cursorPosition < 0 ? 0 : cursorPosition + 1;
    const pageRows = query ? matchingRows.slice(cursorIndex, cursorIndex + limit + 1) : matchingRows;
    const hasMore = pageRows.length > limit;
    const products: CatalogProduct[] = pageRows.slice(0, limit).map((product) => {
      const translation = product.translations[0];
      return {
        id: product.id,
        slug: product.slug,
        priceCents: product.priceCents,
        currency: product.currency,
        imageUrl: product.imageUrl,
        specifications: getSpecifications(product.specifications),
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
  } catch (error) {
    console.error("Could not load catalog products.", error);
    return { products: [], nextCursor: null };
  }
}
