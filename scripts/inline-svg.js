// images/checkbox.svg, images/checkbox-checked.svg 를 읽어서 js/checkbox-svg.js 로 만들어요.
// (폰 앱에서는 파일을 바로 읽을 수 없는 경우가 있어서, SVG 내용을 자바스크립트 안에 넣어두는 방식이에요.)
// 두 파일이 모두 있으면 앱이 체크박스 그림으로 사용하고, 하나라도 없으면 기본 체크박스를 써요.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (name) => {
  const file = path.join(root, "images", name);
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8").replace(/<\?xml[^>]*\?>/g, "").replace(/<!DOCTYPE[^>]*>/gi, "").replace(/<!--[\s\S]*?-->/g, "")
    // 검정색(rgb(0,0,0), #000, black)은 테마 색으로 바뀌도록 currentColor 로 바꿔요.
    .replace(/(stroke|fill)="(rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|#000(000)?|black)"/gi, '$1="currentColor"').replace(/\s+/g, " ").trim();
};

const off = read("checkbox.svg");
const on = read("checkbox-checked.svg");
const ok = off && on;

// 아이콘은 하나씩 따로 적용돼요 (있는 것만 그림으로, 없으면 기본 글자)
const icons = {};
for (const name of ["back", "close", "add", "select", "drag"]) {
  const svg = read(name + ".svg");
  if (svg) icons[name] = svg;
}

const out = `// 자동으로 만들어진 파일이에요 — 직접 고치지 말고 images/ 의 SVG 를 바꾼 뒤 npm run build 를 실행하세요.
window.CHECKBOX_SVG = ${JSON.stringify(ok ? { off, on } : {})};
window.ICON_SVG = ${JSON.stringify(icons)};
`;
fs.writeFileSync(path.join(root, "js", "checkbox-svg.js"), out);
console.log("아이콘:", Object.keys(icons).join(", ") || "없음 (기본 글자를 써요)");
console.log(ok ? "체크박스 SVG 2개를 js/checkbox-svg.js 에 넣었어요." : "체크박스 SVG 가 없어서 기본 체크박스를 써요. (images/checkbox.svg + checkbox-checked.svg 둘 다 필요)");
