import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth";
import { RetailerCity } from "@prisma/client";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in to create your profile." }, { status: 401 });
  }

  try {
    if (!user.email) {
      return NextResponse.json({ error: "An email address is required for your profile." }, { status: 400 });
    }

    let city: RetailerCity | undefined;
    const bodyText = await request.text();
    if (bodyText) {
      let body: unknown;
      try {
        body = JSON.parse(bodyText);
      } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
      }
      if (typeof body === "object" && body !== null && "city" in body && body.city !== undefined) {
        if (typeof body.city !== "string" || !Object.values(RetailerCity).includes(body.city as RetailerCity)) {
          return NextResponse.json({ error: "Choose a supported delivery city." }, { status: 400 });
        }
        city = body.city as RetailerCity;
      }
    }

    const profile = await prisma.user.upsert({
      where: { authUserId: user.id },
      create: {
        authUserId: user.id,
        email: user.email,
        name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
        city,
      },
      update: { email: user.email, ...(city ? { city } : {}) },
      select: { id: true, email: true, name: true, city: true, createdAt: true },
    });

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error("Failed to sync the authenticated user profile.", error);
    return NextResponse.json({ error: "Unable to save the user profile." }, { status: 500 });
  }
}
