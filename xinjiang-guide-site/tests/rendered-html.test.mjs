import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const publicRoot = new URL("../public/", import.meta.url);

async function renderRoot() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
      redirect: "manual",
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("root opens the finished travel guide", async () => {
  const response = await renderRoot();
  assert.ok([301, 302, 303, 307, 308].includes(response.status));
  const location = response.headers.get("location");
  assert.ok(location);
  assert.equal(new URL(location, "http://localhost").pathname, "/index.html");
});

test("keeps the two downloadable guide files identical and corrected", async () => {
  const [guide, namedCopy] = await Promise.all([
    readFile(new URL("index.html", publicRoot), "utf8"),
    readFile(new URL("北疆国庆自驾攻略.html", publicRoot), "utf8"),
  ]);

  assert.equal(namedCopy, guide);
  assert.match(guide, /喀纳斯老村优先/);
  assert.match(guide, /鸿腾旅途首选/);
  assert.match(guide, /牧马先生首选/);
  assert.match(guide, /酒店卸行李 → 一嗨还车/);
  assert.match(guide, /约90—120 km/);
  assert.doesNotMatch(guide, /喀纳斯新村9\/28住1晚/);
  assert.doesNotMatch(guide, /已订部分约¥4,114\/间/);
  assert.doesNotMatch(guide, /class="sites-skeleton/);
});

test("all local guide images exist", async () => {
  const guide = await readFile(new URL("index.html", publicRoot), "utf8");
  const imagePaths = [...guide.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((src) => !/^(?:https?:|data:)/i.test(src) && !src.includes("${"));

  assert.ok(imagePaths.length > 0);
  await Promise.all(
    [...new Set(imagePaths)].map((src) => access(new URL(src, publicRoot))),
  );
  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)),
  );
});
