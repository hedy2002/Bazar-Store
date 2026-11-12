import { NextRequest, NextResponse } from "next/server";
import { getCatalogProducts, storeLocales } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const locale = params.get("locale") ?? "en";
  const cursor = params.get("cursor") ?? undefined;
  const rawLimit = params.get("limit") ?? "24";
  const limit = Number(rawLimit);

  if (!storeLocales.includes(locale as (typeof storeLocales)[number])) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: "Limit must be between 1 and 50." }, { status: 400 });
  }

  try {
    const result = await getCatalogProducts(
      locale as (typeof storeLocales)[number],
      cursor,
      limit,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to load the product catalog.", error);
    return NextResponse.json(
      { error: "Unable to load the product catalog." },
      { status: 500 },
    );
  }
}
