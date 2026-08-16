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
  assert.match(guide, /贾登峪栖云客栈/);
  assert.match(guide, /疆缘情精品酒店（喀纳斯景区店）/);
  assert.match(guide, /双床房¥2,155\/间/);
  assert.match(guide, /机场落地 → 一嗨取车 → 全季酒店/);
  assert.match(guide, /一嗨深蓝G318（7天20小时）/);
  assert.match(guide, /订单页面总价¥5,047/);
  assert.match(guide, /新疆昆仑宾馆停车场/);
  assert.match(guide, /乌伦古湖黄金海岸景区/);
  assert.match(guide, /黄金海岸并非“停30分钟”/);
  assert.match(guide, /乌希里克观景停车区/);
  assert.match(guide, /新村6站/);
  assert.match(guide, /月亮湾→卧龙湾/);
  assert.match(guide, /赛里木湖东立交133出口/);
  assert.match(guide, /查看当天详细路书/);
  assert.match(guide, /d0:/);
  assert.match(guide, /d9:/);
  assert.match(guide, /\.days \.day-cols \{ display: none; \}/);
  assert.match(guide, /约90—120 km/);
  assert.match(guide, /餐饮<\/td><td>¥5,000—7,000/);
  assert.match(guide, /建议人均准备<\/span><strong>¥7,800—9,000/);
  assert.match(guide, /赛里木湖新规（2026年8月20日起）/);
  assert.match(guide, /5座及以下¥120\/车/);
  assert.match(guide, /¥70×4＋¥120＝<strong>¥400/);
  assert.match(guide, /核心必付票务暂计/);
  assert.match(guide, /¥2,268\/4人/);
  assert.match(guide, /两日多次进出有效期未确认/);
  assert.match(guide, /门票¥42＋小火车¥20＝¥62\/人/);
  assert.match(guide, /估算合计<\/strong><\/td><td><strong>¥31,021—35,971/);
  assert.match(guide, /CCMALL时代广场新民路亚朵/);
  assert.match(guide, /9晚共¥7,103\/间、两间合计¥14,206/);
  assert.doesNotMatch(guide, /喀纳斯新村9\/28住1晚/);
  assert.doesNotMatch(guide, /鸿腾旅途首选/);
  assert.doesNotMatch(guide, /牧马先生首选/);
  assert.doesNotMatch(guide, /当晚不取车/);
  assert.doesNotMatch(guide, /9\/26上午取车/);
  assert.doesNotMatch(guide, /一嗨订单指定门店/);
  assert.doesNotMatch(guide, /餐饮<\/td><td>¥8,000—12,000/);
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
