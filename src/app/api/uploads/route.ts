import { Buffer } from "node:buffer";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const toNumber = (value: FormDataEntryValue | null) =>
  typeof value === "string" && !Number.isNaN(Number(value))
    ? Number(value)
    : undefined;

const uploadWithVercelBlob = async (
  file: File,
  width?: number,
  height?: number,
) => {
  const key = `chat-images/${nanoid()}-${file.name}`.replace(/\s+/g, "-");
  const uploadOptions: Parameters<typeof put>[2] = {
    access: "public",
    contentType: file.type || "application/octet-stream",
  };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    uploadOptions.token = process.env.BLOB_READ_WRITE_TOKEN;
  }

  const blob = await put(key, file, uploadOptions);
  return {
    id: blob.pathname,
    url: blob.url,
    width,
    height,
    name: file.name,
    size: file.size,
  };
};

const createInlineAttachment = async (
  file: File,
  width?: number,
  height?: number,
) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const url = `data:${file.type || "application/octet-stream"};base64,${base64}`;
  return {
    id: `inline-${nanoid()}`,
    url,
    width,
    height,
    name: file.name,
    size: file.size,
  };
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Images must be 5MB or smaller." },
      { status: 400 },
    );
  }

  const width = toNumber(formData.get("width"));
  const height = toNumber(formData.get("height"));

  try {
    const attachment = process.env.BLOB_READ_WRITE_TOKEN
      ? await uploadWithVercelBlob(file, width, height)
      : await createInlineAttachment(file, width, height);

    return NextResponse.json(attachment);
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json(
      { error: "Unable to upload image right now." },
      { status: 500 },
    );
  }
}


