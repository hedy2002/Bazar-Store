import { NextRequest, NextResponse } from "next/server";
import { canAccessAdmin, getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to view this invoice." }, { status: 401 });

  try {
    const { id } = await context.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { authUserId: true, name: true, email: true } },
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPriceCents: true,
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.user.authUserId !== user.id && !canAccessAdmin(user.email)) {
      return NextResponse.json({ error: "You cannot access this order." }, { status: 403 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        currency: order.currency,
        totalCents: order.totalCents,
        customerName: order.customerName,
        phoneNumber: order.phoneNumber,
        deliveryAddress: order.deliveryAddress,
        deliveryCity: order.deliveryCity,
        createdAt: order.createdAt,
        retailer: { name: order.user.name, email: order.user.email },
        items: order.items,
      },
    });
  } catch (error) {
    console.error("Failed to load order invoice data.", error);
    return NextResponse.json({ error: "Unable to load invoice." }, { status: 500 });
  }
}
