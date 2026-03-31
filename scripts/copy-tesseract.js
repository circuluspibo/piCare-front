// scripts/copy-tesseract.js
import { cpSync, mkdirSync, existsSync, statSync, createWriteStream } from "fs";
import { resolve } from "path";
import { get } from "https";

const COPY_TARGETS = [
  { from: "node_modules/tesseract.js/dist", to: "public/tesseract/dist" },
  { from: "node_modules/tesseract.js-core", to: "public/tesseract/core" },
];

for (const { from, to } of COPY_TARGETS) {
  const src = resolve(from);
  const dest = resolve(to);

  if (!existsSync(src)) {
    console.warn(`[skip] ${from} not found`);
    continue;
  }

  mkdirSync(dest, { recursive: true });

  cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      if (statSync(srcPath).isDirectory()) return true;
      return !srcPath.endsWith(".map");
    },
  });

  console.log(`[ok] ${from} → ${to}`);
}

// ── 언어 데이터 다운로드 ────────────────────────────────────────────────────
const LANG_DEST = resolve("public/tessdata/kor.traineddata");

// 비압축 .traineddata URL — gunzip 불필요
const LANG_URL =
  "https://github.com/tesseract-ocr/tessdata_fast/raw/main/kor.traineddata";

if (existsSync(LANG_DEST)) {
  console.log("[skip] kor.traineddata already exists");
} else {
  mkdirSync(resolve("public/tessdata"), { recursive: true });
  console.log("[download] kor.traineddata (~8MB)...");

  await new Promise((res, rej) => {
    const file = createWriteStream(LANG_DEST);

    const request = (url) =>
      get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          return request(response.headers.location);
        }
        if (response.statusCode !== 200) {
          rej(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        // 비압축 파일이므로 직접 파이프 — createGunzip() 없음
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          res();
        });
        file.on("error", rej);
      }).on("error", rej);

    request(LANG_URL);
  });

  console.log("[ok] kor.traineddata downloaded");
}
