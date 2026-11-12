import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bazar Wholesale",
    short_name: "Bazar",
    description: "B2B wholesale catalog and order tracking.",
    start_url: "/en",
    display: "standalone",
    background_color: "#f7f7f1",
    theme_color: "#1d5947",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
