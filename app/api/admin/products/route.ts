import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { canManageProducts, getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeLocales, type StoreLocale } from "@/lib/catalog";
import { parseAdminProductInput, type AdminProductInput } from "@/lib/admin-products";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxUploadBytes = 4 * 1024 * 1024;
const maxRows = 5000;
const locales = storeLocales;
const baseHeaders = ["slug", "priceCents", "costPriceCents", "stock", "currency", "imageUrl", "active"];
const exportHeaders = [...baseHeaders, "specifications"];

type ImportProduct = {
  slug: string;
  priceCents: number;
  costPriceCents: number;
  stock: number;
  currency: string;
  imageUrl: string | null;
  active: boolean;
  specifications: string | null;
  specificationsProvided: boolean;
  translations: { locale: StoreLocale; name: string; description: string | null; category: string }[];
};

function text(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  return "";
}

function parseInteger(value: string, field: string, row: number, minimum = 0) {
  if (!/^\d+$/.test(value)) throw new Error(`Row ${row}: ${field} must be a whole number.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > 2_147_483_647) {
    throw new Error(`Row ${row}: ${field} is outside the supported range.`);
  }
  return parsed;
}

function parseImportSpecifications(value: string, row: number) {
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Row ${row}: specifications must be valid JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Row ${row}: specifications must be a JSON object.`);
  }
  const entries = Object.entries(parsed);
  if (
    entries.length > 40 ||
    entries.some(([key, item]) =>
      !key.trim() ||
      key.length > 60 ||
      (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") ||
      (typeof item === "string" && item.length > 500) ||
      (typeof item === "number" && !Number.isFinite(item)),
    )
  ) {
    throw new Error(`Row ${row}: specifications have invalid names or values.`);
  }
  const serialized = JSON.stringify(parsed);
  if (serialized.length > 8_000) throw new Error(`Row ${row}: specifications must be 8 KB or smaller.`);
  return serialized;
}

async function parseImport(file: File): Promise<ImportProduct[]> {
  if (file.size === 0 || file.size > maxUploadBytes) {
    throw new Error("Upload a non-empty CSV or Excel file smaller than 4 MB.");
  }

  const name = file.name.toLowerCase();
  const workbook = new ExcelJS.Workbook();
  const bytes = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".csv")) {
    await workbook.csv.read(Readable.from([bytes.toString("utf8")]));
  } else if (name.endsWith(".xlsx")) {
    await workbook.xlsx.read(Readable.from([bytes]));
  } else {
    throw new Error("Only .csv and .xlsx files are supported.");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) throw new Error("The file needs a header row and at least one product.");
  if (sheet.rowCount - 1 > maxRows) throw new Error(`Import up to ${maxRows} products per file.`);

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
    headers[column - 1] = text(cell.value).replace(/^\uFEFF/, "").toLowerCase();
  });
  const headerIndexes = new Map<string, number>();
  headers.forEach((header, index) => {
    if (!header) return;
    if (headerIndexes.has(header)) throw new Error(`Duplicate column: ${header}`);
    headerIndexes.set(header, index + 1);
  });

  const required = [
    ...baseHeaders,
    ...locales.flatMap((locale) => [`name_${locale}`, `category_${locale}`]),
  ];
  const missing = required.filter((header) => !headerIndexes.has(header));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  const seenSlugs = new Set<string>();
  const products: ImportProduct[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    for (let column = 1; column <= headers.length; column += 1) {
      if (row.getCell(column).type === ExcelJS.ValueType.Formula) {
        throw new Error(`Row ${rowNumber}: formulas are not allowed in import files.`);
      }
    }

    const get = (column: string) => text(row.getCell(headerIndexes.get(column)!).value);
    const slug = get("slug");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`Row ${rowNumber}: slug must use lowercase letters, numbers, and hyphens.`);
    }
    if (seenSlugs.has(slug)) throw new Error(`Row ${rowNumber}: duplicate slug "${slug}".`);
    seenSlugs.add(slug);

    const currency = get("currency").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error(`Row ${rowNumber}: currency must be a 3-letter code.`);
    const imageText = get("imageUrl");
    let imageUrl: string | null = null;
    if (imageText) {
      try {
        const parsed = new URL(imageText);
        if (parsed.protocol !== "https:") throw new Error();
        imageUrl = parsed.toString();
      } catch {
        throw new Error(`Row ${rowNumber}: imageUrl must be an HTTPS URL.`);
      }
    }

    const activeText = get("active").toLowerCase();
    if (!["true", "false", "1", "0"].includes(activeText)) {
      throw new Error(`Row ${rowNumber}: active must be true or false.`);
    }
    const translations = locales.map((locale) => {
      const localizedName = get(`name_${locale}`);
      const category = get(`category_${locale}`);
      if (!localizedName || !category) {
        throw new Error(`Row ${rowNumber}: name_${locale} and category_${locale} are required.`);
      }
      return {
        locale,
        name: localizedName,
        category,
        description: get(`description_${locale}`) || null,
      };
    });

    products.push({
      slug,
      priceCents: parseInteger(get("priceCents"), "priceCents", rowNumber),
      costPriceCents: parseInteger(get("costPriceCents"), "costPriceCents", rowNumber),
      stock: parseInteger(get("stock"), "stock", rowNumber),
      currency,
      imageUrl,
      active: activeText === "true" || activeText === "1",
      specificationsProvided: headerIndexes.has("specifications"),
      specifications: headerIndexes.has("specifications")
        ? parseImportSpecifications(get("specifications"), rowNumber)
        : null,
      translations,
    });
  });

  if (!products.length) throw new Error("No product rows were found.");
  return products;
}

function csvSafe(value: string | number | boolean | null) {
  const stringValue = value === null ? "" : String(value);
  return /^[\s]*[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!canManageProducts(user.email)) return NextResponse.json({ error: "Store owner access is required." }, { status: 403 });

  try {
    const products = await prisma.product.findMany({
      orderBy: { slug: "asc" },
      include: { translations: true },
    });
    const formatParam = request.nextUrl.searchParams.get("format");
    if (!formatParam) {
      return NextResponse.json({ products });
    }

    const translationsByProduct = new Map(
      products.map((product) => [
        product.id,
        new Map(product.translations.map((translation) => [translation.locale, translation])),
      ]),
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Products");
    sheet.addRow([
      ...exportHeaders,
      ...locales.flatMap((locale) => [`name_${locale}`, `category_${locale}`, `description_${locale}`]),
    ]);

    for (const product of products) {
      const translations = translationsByProduct.get(product.id)!;
      const values: (string | number | boolean | null)[] = [
        product.slug,
        product.priceCents,
        product.costPriceCents,
        product.stock,
        product.currency,
        product.imageUrl,
        product.active,
        product.specifications === null ? "" : JSON.stringify(product.specifications),
      ];
      for (const locale of locales) {
        const translation = translations.get(locale);
        values.push(translation?.name ?? "", translation?.category ?? "", translation?.description ?? "");
      }
      sheet.addRow(
        request.nextUrl.searchParams.get("format") === "csv"
          ? values.map(csvSafe)
          : values,
      );
    }

    const format = formatParam === "csv" ? "csv" : "xlsx";
    const data =
      format === "csv"
        ? await workbook.csv.writeBuffer()
        : await workbook.xlsx.writeBuffer();
    return new NextResponse(data, {
      headers: {
        "Content-Type": format === "csv"
          ? "text/csv; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bazar-products.${format}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export products.", error);
    return NextResponse.json({ error: "Unable to export products." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!canManageProducts(user.email)) return NextResponse.json({ error: "Store owner access is required." }, { status: 403 });

  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
      }

      let productInput: AdminProductInput;
      try {
        productInput = parseAdminProductInput(body);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Product details are invalid." },
          { status: 400 },
        );
      }

      try {
        const product = await prisma.product.create({
          data: {
            ...productInput,
            translations: { create: productInput.translations },
          },
          include: { translations: true },
        });
        return NextResponse.json({ product }, { status: 201 });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return NextResponse.json({ error: "A product with that slug already exists." }, { status: 409 });
        }
        throw error;
      }
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Select a CSV or .xlsx file." }, { status: 400 });
    }

    let products: ImportProduct[];
    try {
      products = await parseImport(file);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "The import file is invalid." },
        { status: 400 },
      );
    }

    const importedAt = new Date();
    const specificationUpdate = products[0].specificationsProvided
      ? Prisma.sql`"specifications" = EXCLUDED."specifications",`
      : Prisma.empty;
    const result = await prisma.$transaction(async (transaction) => {
      for (let offset = 0; offset < products.length; offset += 200) {
        const batch = products.slice(offset, offset + 200);
        const values = batch.map((product) => Prisma.sql`(
          ${randomUUID()},
          ${product.slug},
          ${product.priceCents},
          ${product.costPriceCents},
          ${product.currency},
          ${product.imageUrl},
          ${product.stock},
          ${product.active},
          ${product.specifications}::jsonb,
          ${importedAt},
          ${importedAt}
        )`);

        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO "Product" ("id", "slug", "priceCents", "costPriceCents", "currency", "imageUrl", "stock", "active", "specifications", "createdAt", "updatedAt")
          VALUES ${Prisma.join(values)}
          ON CONFLICT ("slug") DO UPDATE SET
            "priceCents" = EXCLUDED."priceCents",
            "costPriceCents" = EXCLUDED."costPriceCents",
            "currency" = EXCLUDED."currency",
            "imageUrl" = EXCLUDED."imageUrl",
            "stock" = EXCLUDED."stock",
            "active" = EXCLUDED."active",
            ${specificationUpdate}
            "updatedAt" = EXCLUDED."updatedAt"
        `);
      }

      const slugs = products.map((product) => product.slug);
      const savedProducts = await transaction.product.findMany({
        where: { slug: { in: slugs } },
        select: { id: true, slug: true },
      });
      const idsBySlug = new Map(savedProducts.map((product) => [product.slug, product.id]));
      const productIds = savedProducts.map((product) => product.id);
      await transaction.productTranslation.deleteMany({ where: { productId: { in: productIds } } });

      const translations = products.flatMap((product) =>
        product.translations.map((translation) => ({
          productId: idsBySlug.get(product.slug)!,
          locale: translation.locale,
          name: translation.name,
          description: translation.description,
          category: translation.category,
        })),
      );
      for (let offset = 0; offset < translations.length; offset += 500) {
        await transaction.productTranslation.createMany({
          data: translations.slice(offset, offset + 500),
        });
      }

      return { imported: products.length };
    }, { maxWait: 10_000, timeout: 55_000 });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to import products.", error);
    return NextResponse.json({ error: "Unable to import products. No partial import was saved." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in as a store owner." }, { status: 401 });
  if (!canManageProducts(user.email)) return NextResponse.json({ error: "Store owner access is required." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("id" in body) || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "A product ID is required." }, { status: 400 });
  }

  let productInput: AdminProductInput;
  try {
    productInput = parseAdminProductInput(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product details are invalid." },
      { status: 400 },
    );
  }

  try {
    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        ...productInput,
        translations: {
          deleteMany: {},
          create: productInput.translations,
        },
      },
      include: { translations: true },
    });
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A product with that slug already exists." }, { status: 409 });
    }
    console.error("Failed to update product.", error);
    return NextResponse.json({ error: "Unable to update product." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in as a store owner." }, { status: 401 });
  if (!canManageProducts(user.email)) return NextResponse.json({ error: "Store owner access is required." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("id" in body) || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "A product ID is required." }, { status: 400 });
  }

  try {
    await prisma.product.delete({ where: { id: body.id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "This product is in an order and cannot be deleted. Deactivate it instead." },
        { status: 409 },
      );
    }
    console.error("Failed to delete product.", error);
    return NextResponse.json({ error: "Unable to delete product." }, { status: 500 });
  }
}
