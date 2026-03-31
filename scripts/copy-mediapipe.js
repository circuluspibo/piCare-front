// scripts/copy-mediapipe.js
import { cpSync, mkdirSync, existsSync, statSync } from "fs";
import { resolve } from "path";

const packages = [
  { from: "@mediapipe/hands", to: "public/mediapipe/hands" },
  { from: "@mediapipe/pose", to: "public/mediapipe/pose" },
];

for (const { from, to } of packages) {
  const src = resolve("node_modules", from);
  const dest = resolve(to);

  if (!existsSync(src)) {
    console.warn(`[skip] ${from} not found in node_modules`);
    continue;
  }

  mkdirSync(dest, { recursive: true });

  cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      // ✅ 디렉토리는 무조건 통과시켜야 하위 파일까지 탐색함
      if (statSync(srcPath).isDirectory()) return true;
      // 소스맵 파일만 제외
      return !srcPath.endsWith(".map");
    },
  });

  console.log(`[ok] ${from} → ${to}`);
}
