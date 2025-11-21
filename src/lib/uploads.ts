import type { ImageAttachment } from "@/types/chat";

const readImageDimensions = (file: File) =>
  new Promise<{ width?: number; height?: number }>((resolve) => {
    if (typeof window === "undefined") {
      resolve({});
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      resolve({});
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });

export async function uploadChatImage(file: File): Promise<ImageAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const dimensions = await readImageDimensions(file);
  if (dimensions.width) {
    formData.append("width", String(dimensions.width));
  }
  if (dimensions.height) {
    formData.append("height", String(dimensions.height));
  }

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Image upload failed.";
    try {
      const error = (await response.json()) as { error?: string };
      if (error?.error) {
        message = error.error;
      }
    } catch {
      // ignore parse failures
    }
    throw new Error(message);
  }

  return (await response.json()) as ImageAttachment;
}


