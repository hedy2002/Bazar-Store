import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { getRequestUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (
      typeof body !== "object" ||
      body === null ||
      !("status" in body) ||
      typeof body.status !== "string" ||
      !Object.values(OrderStatus).includes(body.status as OrderStatus)
    ) {
      return NextResponse.json({ error: "Choose a valid order status." }, { status: 400 });
    }

    const { id } = await context.params;
    const order = await prisma.order.update({
      where: { id },
      data: { status: body.status as OrderStatus },
      select: { id: true, status: true },
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    console.error("Failed to update order status.", error);
    return NextResponse.json({ error: "Unable to update order status." }, { status: 500 });
  }
}
