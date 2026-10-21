// Renders Margo's app icons with Playwright: `npm run icons` (needs playwright + @fontsource/bricolage-grotesque installed).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const font = readFileSync(require.resolve("@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2")).toString("base64");

const html = (size, safe) => `<!doctype html><html><head><style>
@font-face{font-family:B;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:700}
html,body{margin:0;width:${size}px;height:${size}px}
.i{width:100%;height:100%;background:#55613a;display:grid;place-items:center;position:relative;overflow:hidden}
.i::before{content:"";position:absolute;inset:${safe ? "-20%" : "-10%"} ${safe ? "-20%" : "-10%"} auto auto;width:70%;height:70%;border-radius:50%;background:#6b7a49;opacity:.55}
.m{position:relative;font-family:B;font-weight:700;color:#f3f0ea;font-size:${Math.round(size * (safe ? 0.46 : 0.6))}px;line-height:1;letter-spacing:-.04em;transform:translateY(-3%)}
.m span{color:#d9b48a}
</style></head><body><div class="i"><div class="m">M<span>.</span></div></div></body></html>`;

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
for (const [name, size, safe] of [["icon-192", 192, false], ["icon-512", 512, false], ["icon-maskable-512", 512, true], ["apple-touch-icon", 180, false]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(html(size, safe));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/icons/${name}.png` });
  await page.close();
}
await browser.close();
console.log("icons written to public/icons");
