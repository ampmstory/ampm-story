// 네이버 블로그 RSS에서 최근 글 3개를 읽어 data/posts.json에 저장합니다.
import { writeFile } from "node:fs/promises";

const FEED = "https://rss.blog.naver.com/ampmstory365.xml";
const OUT = "data/posts.json";
const LIMIT = 3;

const strip = s => (s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? strip(m[1]) : "";
};
const decode = s => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, "&");

function fmtDate(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return "";
  const k = new Date(d.getTime() + 9 * 3600 * 1000); // 한국 시간
  const p = n => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}.${p(k.getUTCMonth() + 1)}.${p(k.getUTCDate())}`;
}

const res = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0 ampmstory-site" } });
if (!res.ok) throw new Error(`RSS 요청 실패: ${res.status}`);
const xml = await res.text();

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, LIMIT).map(([, b]) => {
  const desc = decode(tag(b, "description"));
  const img = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
  return {
    title: decode(tag(b, "title")),
    link: tag(b, "link").replace(/\?fromRss=true.*$/, ""),
    date: fmtDate(tag(b, "pubDate")),
    thumb: img ? img[1] : ""
  };
}).filter(i => i.title && i.link);

if (!items.length) throw new Error("글을 찾지 못했어요. 기존 posts.json을 유지합니다.");

await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + "\n");
console.log(`최근 글 ${items.length}개 저장 완료`);
