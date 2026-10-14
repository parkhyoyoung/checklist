// images/app-icon.png (1024x1024) 하나로 안드로이드 아이콘 재료를 만들어요.
//  - assets/icon-only.png       : 원본 그대로 (옛날 안드로이드용)
//  - assets/icon-foreground.png : 원본을 66% 로 줄여서 가운데에 (요즘 안드로이드의 동그란/둥근네모 아이콘용)
//  - assets/icon-background.png : 원본 왼쪽 위 모서리 색으로 꽉 채운 뒷배경
//  - assets/bg-color.txt        : 그 색 코드
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const src = path.join(root, "images", "app-icon.png");
const out = path.join(root, "assets");

(async () => {
  if (!fs.existsSync(src)) { console.log("images/app-icon.png 가 없어서 기본 아이콘을 써요."); process.exit(0); }
  fs.mkdirSync(out, { recursive: true });
  const size = 1024;
  const base = await sharp(src).resize(size, size, { fit: "cover" }).ensureAlpha().toBuffer();
  fs.writeFileSync(path.join(out, "icon-only.png"), await sharp(base).png().toBuffer());

  const inner = Math.round(size * 0.66);
  const small = await sharp(base).resize(inner, inner).toBuffer();
  const pad = Math.round((size - inner) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: small, left: pad, top: pad }])
    .png().toFile(path.join(out, "icon-foreground.png"));

  const { data } = await sharp(base).extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const hex = "#" + [data[0], data[1], data[2]].map(v => v.toString(16).padStart(2, "0")).join("");
  fs.writeFileSync(path.join(out, "bg-color.txt"), hex);
  // 뒷배경: 위 색으로 꽉 채운 한 장
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: data[0], g: data[1], b: data[2], alpha: 1 } } })
    .png().toFile(path.join(out, "icon-background.png"));
  console.log("아이콘 재료를 만들었어요. 배경색:", hex);
})();
