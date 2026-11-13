import { Prisma } from "@prisma/client";
import { storeLocales, type StoreLocale } from "@/lib/catalog";

export type AdminProductInput = {
  slug: string;
  priceCents: number;
  costPriceCents: number;
  stock: number;
  currency: string;
  imageUrl: string | null;
  active: boolean;
  specifications: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  translations: {
    locale: StoreLocale;
    name: string;
    description: string | null;
    category: string;
  }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string, maximum = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new Error(`${label} is required and must be ${maximum} characters or fewer.`);
  }
  return value.trim();
}

function integer(value: unknown, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 2_147_483_647
  ) {
    throw new Error(`${label} must be a whole number between 0 and 2,147,483,647.`);
  }
  return value;
}

function specifications(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null || value === "") return Prisma.JsonNull;
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("Specifications must be valid JSON.");
    }
  }
  if (!isRecord(parsed)) throw new Error("Specifications must be a JSON object.");

  const entries = Object.entries(parsed);
  if (entries.length > 40) throw new Error("Add no more than 40 specification fields.");
  for (const [key, item] of entries) {
    if (!key.trim() || key.length > 60) throw new Error("Specification names must be 1 to 60 characters.");
    if (
      typeof item !== "string" &&
      typeof item !== "number" &&
      typeof item !== "boolean"
    ) {
      throw new Error("Each specification value must be text, a number, or true/false.");
    }
    if (typeof item === "string" && item.length > 500) {
      throw new Error("Specification values must be 500 characters or fewer.");
    }
    if (typeof item === "number" && !Number.isFinite(item)) {
      throw new Error("Specification numbers must be finite.");
    }
  }
  if (JSON.stringify(parsed).length > 8_000) {
    throw new Error("Specifications must be 8 KB or smaller.");
  }
  return parsed as Prisma.InputJsonObject;
}

export function parseAdminProductInput(value: unknown): AdminProductInput {
  if (!isRecord(value)) throw new Error("Product details must be an object.");

  const slug = requiredText(value.slug, "Slug", 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must use lowercase letters, numbers, and hyphens.");
  }

  const currency = requiredText(value.currency, "Currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Currency must be a 3-letter code.");

  let imageUrl: string | null = null;
  if (value.imageUrl !== null && value.imageUrl !== undefined && value.imageUrl !== "") {
    if (typeof value.imageUrl !== "string") throw new Error("Image URL must be a string.");
    try {
      const url = new URL(value.imageUrl);
      if (url.protocol !== "https:") throw new Error();
      imageUrl = url.toString();
    } catch {
      throw new Error("Image URL must be an HTTPS URL.");
    }
  }

  if (typeof value.active !== "boolean") throw new Error("Active must be true or false.");
  const translationValues = value.translations;
  if (!Array.isArray(translationValues)) throw new Error("Translations are required for every language.");
  const translations = storeLocales.map((locale) => {
    const translation = translationValues.find(
      (item: unknown) => isRecord(item) && item.locale === locale,
    );
    if (!isRecord(translation)) throw new Error(`Add a ${locale} translation.`);
    const description = translation.description;
    if (description !== undefined && description !== null && typeof description !== "string") {
      throw new Error(`The ${locale} description must be text.`);
    }
    if (typeof description === "string" && description.length > 5_000) {
      throw new Error(`The ${locale} description must be 5,000 characters or fewer.`);
    }
    return {
      locale,
      name: requiredText(translation.name, `${locale} product name`, 200),
      category: requiredText(translation.category, `${locale} category`, 100),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
    };
  });

  return {
    slug,
    priceCents: integer(value.priceCents, "Price"),
    costPriceCents: integer(value.costPriceCents, "Cost price"),
    stock: integer(value.stock, "Stock"),
    currency,
    imageUrl,
    active: value.active,
    specifications: specifications(value.specifications),
    translations,
  };
}
