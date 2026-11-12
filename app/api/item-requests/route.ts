import { NextRequest, NextResponse } from "next/server";
import { RetailerCity } from "@prisma/client";
import { getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to request an item." }, { status: 401 });

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (!isRecord(body)) return NextResponse.json({ error: "Enter the item details." }, { status: 400 });
    const itemName = typeof body.itemName === "string" ? body.itemName.trim() : "";
    const details = typeof body.details === "string" ? body.details.trim() : "";
    const city = typeof body.city === "string" ? body.city : "";

    if (itemName.length < 2 || itemName.length > 120) {
      return NextResponse.json({ error: "Item name must be between 2 and 120 characters." }, { status: 400 });
    }
    if (details.length > 1000) {
      return NextResponse.json({ error: "Details must be 1000 characters or fewer." }, { status: 400 });
    }
    if (!Object.values(RetailerCity).includes(city as RetailerCity)) {
      return NextResponse.json({ error: "Choose a supported delivery city." }, { status: 400 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "An email address is required for your request." }, { status: 400 });
    }

    const requestRecord = await prisma.$transaction(async (transaction) => {
      const retailer = await transaction.user.upsert({
        where: { authUserId: user.id },
        create: {
          authUserId: user.id,
          email: user.email!,
          name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
          city: city as RetailerCity,
        },
        update: { email: user.email!, city: city as RetailerCity },
        select: { id: true },
      });

      return transaction.customItemRequest.create({
        data: {
          userId: retailer.id,
          itemName,
          details: details || null,
          city: city as RetailerCity,
        },
        select: { id: true, itemName: true, status: true, createdAt: true },
      });
    });

    return NextResponse.json({ request: requestRecord }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit custom item request.", error);
    return NextResponse.json({ error: "Unable to submit your item request." }, { status: 500 });
  }
}
