import { NextRequest, NextResponse } from "next/server";
import { ItemRequestStatus, RetailerCity } from "@prisma/client";
import { getRequestUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const city = request.nextUrl.searchParams.get("city");
  if (city && !Object.values(RetailerCity).includes(city as RetailerCity)) {
    return NextResponse.json({ error: "Choose a supported delivery city." }, { status: 400 });
  }

  try {
    const requests = await prisma.customItemRequest.findMany({
      where: city ? { city: city as RetailerCity } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { email: true, name: true } } },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Failed to load custom item requests.", error);
    return NextResponse.json({ error: "Unable to load item requests." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
      !("id" in body) ||
      typeof body.id !== "string" ||
      !("status" in body) ||
      typeof body.status !== "string" ||
      !Object.values(ItemRequestStatus).includes(body.status as ItemRequestStatus)
    ) {
      return NextResponse.json({ error: "Choose an item request and a valid status." }, { status: 400 });
    }

    const itemRequest = await prisma.customItemRequest.update({
      where: { id: body.id },
      data: { status: body.status as ItemRequestStatus },
      select: { id: true, status: true },
    });
    return NextResponse.json({ request: itemRequest });
  } catch (error) {
    console.error("Failed to update item request status.", error);
    return NextResponse.json({ error: "Unable to update item request." }, { status: 500 });
  }
}
