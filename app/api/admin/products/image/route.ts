import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { canManageProducts, getRequestUser } from "@/lib/auth";

export const runtime = "nodejs";

const maxImageBytes = 5 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in as a store owner." }, { status: 401 });
  if (!canManageProducts(user.email)) {
    return NextResponse.json({ error: "Store owner access is required." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxImageBytes + 64 * 1024) {
    return NextResponse.json({ error: "Images must be smaller than 5 MB." }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Upload a valid multipart image form." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }
  const extension = allowedTypes[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (file.size === 0 || file.size > maxImageBytes) {
    return NextResponse.json({ error: "Images must be smaller than 5 MB." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Product image storage is not configured on the server." }, { status: 503 });
  }

  const bucket = process.env.PRODUCT_IMAGES_BUCKET ?? "products";
  const path = `${Date.now()}-${randomUUID()}.${extension}`;
  const storage = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isValidImage =
    (file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (file.type === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    (file.type === "image/webp" &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
  if (!isValidImage) {
    return NextResponse.json({ error: "The image contents do not match the selected image type." }, { status: 400 });
  }

  const { error } = await storage.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    console.error("Failed to upload a product image.", error);
    return NextResponse.json({ error: "Unable to upload the image." }, { status: 502 });
  }

  const { data } = storage.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ imageUrl: data.publicUrl }, { status: 201 });
}
