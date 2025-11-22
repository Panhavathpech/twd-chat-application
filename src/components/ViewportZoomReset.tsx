"use client";

import { useEffect } from "react";

const clampMetaContent = (content: string, maximumScale: number) => {
  const maxToken = `maximum-scale=${maximumScale}`;
  if (/maximum-scale=/i.test(content)) {
    return content.replace(/maximum-scale=([0-9.]+)/i, maxToken);
  }
  return `${content}, ${maxToken}`;
};

const ViewportZoomReset = () => {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const meta = document.querySelector<HTMLMetaElement>(
      "meta[name='viewport']",
    );
    if (!meta) {
      return;
    }

    const initialContent =
      meta.getAttribute("content") ??
      "width=device-width, initial-scale=1, maximum-scale=1";

    const enableZoom = () => {
      meta.setAttribute("content", clampMetaContent(initialContent, 5));
    };

    const resetZoom = () => {
      window.setTimeout(() => {
        meta.setAttribute("content", clampMetaContent(initialContent, 1));
      }, 350);
    };

    document.addEventListener("focusin", enableZoom);
    document.addEventListener("focusout", resetZoom);

    return () => {
      document.removeEventListener("focusin", enableZoom);
      document.removeEventListener("focusout", resetZoom);
      meta.setAttribute("content", clampMetaContent(initialContent, 1));
    };
  }, []);

  return null;
};

export default ViewportZoomReset;


