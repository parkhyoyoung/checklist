// 앱에 들어갈 파일만 www/ 폴더로 복사해요. (Capacitor 가 이 폴더를 APK 안에 넣어요)
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of ["index.html", "css", "js", "fonts", "images"]) {
  const src = path.join(root, name);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, name), { recursive: true });
}
console.log("www/ 폴더를 만들었어요.");
