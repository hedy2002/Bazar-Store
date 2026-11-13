import { NextRequest, NextResponse } from "next/server";
import { RetailerCity } from "@prisma/client";
import { canManageOrders, getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!canManageOrders(user.email)) return NextResponse.json({ error: "Store owner access is required." }, { status: 403 });

  const city = request.nextUrl.searchParams.get("city");
  if (city && !Object.values(RetailerCity).includes(city as RetailerCity)) {
    return NextResponse.json({ error: "Choose a supported delivery city." }, { status: 400 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: city ? { deliveryCity: city as RetailerCity } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPriceCents: true,
            unitCostCents: true,
          },
        },
      },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        currency: order.currency,
        totalCents: order.totalCents,
        customerName: order.customerName,
        phoneNumber: order.phoneNumber,
        deliveryAddress: order.deliveryAddress,
        deliveryCity: order.deliveryCity,
        createdAt: order.createdAt,
        retailer: order.user,
        items: order.items.map((item) => ({
          ...item,
          profitCents: (item.unitPriceCents - item.unitCostCents) * item.quantity,
        })),
        profitCents: order.items.reduce(
          (total, item) => total + (item.unitPriceCents - item.unitCostCents) * item.quantity,
          0,
        ),
      })),
    });
  } catch (error) {
    console.error("Failed to load the administrator order list.", error);
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 });
  }
}
