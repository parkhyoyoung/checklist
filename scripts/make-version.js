// package.json 의 version 을 js/app-version.js 로 옮겨요. (앱이 "내 버전"을 알아야 새 버전과 비교할 수 있어요)
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
fs.writeFileSync(path.join(root, "js", "app-version.js"),
  `// 자동으로 만들어진 파일이에요 — package.json 의 "version" 을 고친 뒤 npm run build 를 실행하세요.\nwindow.APP_VERSION = ${JSON.stringify(version)};\n`);
console.log("앱 버전:", version);
