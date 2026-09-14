import { defineConfig } from "vite";
import { CLASSICS } from "./src/classics.js";

export default defineConfig({
  appType: "mpa",
  preview: {
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
  plugins: [
    {
      name: "fractal-reference-index",
      transformIndexHtml(html) {
        const entries = CLASSICS.map(
          (item) =>
            `<div><dt>${item.name}</dt><dd>${item.description} <a href="${item.source}" target="_blank" rel="noopener noreferrer">Reference</a></dd></div>`,
        ).join("");
        return html.replace(
          "<!-- CLASSIC_INDEX -->",
          `<details class="library-index"><summary>About the ${CLASSICS.length} included fractals</summary><dl>${entries}</dl></details>`,
        );
      },
    },
  ],
});
