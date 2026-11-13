import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canPlaceOrders, canViewOwnOrders, getRequestUser } from "@/lib/auth";
import { storeLocales } from "@/lib/catalog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to view your orders." }, { status: 401 });
  }
  if (!canViewOwnOrders(user.email)) {
    return NextResponse.json({ error: "Shop owner access is required." }, { status: 403 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { user: { authUserId: user.id } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalCents: true,
        currency: true,
        deliveryCity: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to load retailer orders.", error);
    return NextResponse.json({ error: "Unable to load your orders." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in before placing an order." }, { status: 401 });
  }
  if (!canPlaceOrders(user.email)) {
    return NextResponse.json({ error: "Shop owner access is required to place orders." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    return NextResponse.json({ error: "An order must contain 1 to 50 items." }, { status: 400 });
  }

  const locale = body.locale ?? "en";
  if (typeof locale !== "string" || !storeLocales.includes(locale as (typeof storeLocales)[number])) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const deliveryAddress = typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim() : "";
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  if (customerName.length < 2 || customerName.length > 120) {
    return NextResponse.json({ error: "Enter your full name (2 to 120 characters)." }, { status: 400 });
  }
  if (phoneNumber.length > 32 || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return NextResponse.json({ error: "Enter a valid phone number with 7 to 15 digits." }, { status: 400 });
  }
  if (deliveryAddress.length < 5 || deliveryAddress.length > 500) {
    return NextResponse.json({ error: "Enter your delivery address and location (5 to 500 characters)." }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const item of body.items) {
    const quantity = isRecord(item) ? item.quantity : undefined;
    if (
      !isRecord(item) ||
      typeof item.productId !== "string" ||
      !item.productId ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      return NextResponse.json({ error: "Each item needs a product ID and quantity from 1 to 20." }, { status: 400 });
    }

    const totalQuantity = (quantities.get(item.productId) ?? 0) + quantity;
    if (totalQuantity > 20) {
      return NextResponse.json({ error: "An item quantity cannot exceed 20." }, { status: 400 });
    }
    quantities.set(item.productId, totalQuantity);
  }

  try {
    if (!user.email) {
      return NextResponse.json({ error: "Add an email address to your account before ordering." }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: [...quantities.keys()] }, active: true },
      include: {
        translations: {
          where: { locale: locale as (typeof storeLocales)[number] },
          select: { name: true },
        },
      },
    });

    if (products.length !== quantities.size) {
      return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
    }

    const currency = products[0].currency;
    if (products.some((product) => product.currency !== currency)) {
      return NextResponse.json({ error: "Products in an order must use the same currency." }, { status: 400 });
    }

    const items = products.map((product) => {
      const quantity = quantities.get(product.id)!;
      if (quantity > product.stock) {
        throw new Error(`INSUFFICIENT_STOCK:${product.id}`);
      }

      const translation = product.translations[0];
      if (!translation) {
        throw new Error(`MISSING_TRANSLATION:${product.id}`);
      }

      return {
        productId: product.id,
        productName: translation.name,
        quantity,
        unitPriceCents: product.priceCents,
        unitCostCents: product.costPriceCents,
      };
    });
    const totalCents = items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);

    const order = await prisma.$transaction(async (transaction) => {
      const dbUser = await transaction.user.upsert({
        where: { authUserId: user.id },
        create: {
          authUserId: user.id,
          email: user.email!,
          name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
        },
        update: { email: user.email! },
      });

      if (!dbUser.city) {
        throw new Error("RETAILER_CITY_REQUIRED");
      }

      return transaction.order.create({
        data: {
          userId: dbUser.id,
          email: user.email!,
          customerName,
          phoneNumber,
          deliveryAddress,
          currency,
          totalCents,
          deliveryCity: dbUser.city,
          items: { create: items },
        },
        select: {
          id: true,
          status: true,
          totalCents: true,
          currency: true,
          deliveryCity: true,
          customerName: true,
          phoneNumber: true,
          deliveryAddress: true,
        },
      });
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json({ error: "One or more products are out of stock." }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("MISSING_TRANSLATION:")) {
      return NextResponse.json({ error: "A product is not available in the selected language." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "RETAILER_CITY_REQUIRED") {
      return NextResponse.json({ error: "Choose your delivery city in your retailer profile before ordering." }, { status: 400 });
    }

    console.error("Failed to create the order.", error);
    return NextResponse.json({ error: "Unable to create the order." }, { status: 500 });
  }
}
