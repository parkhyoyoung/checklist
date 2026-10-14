# 체크리스트 앱

## 폴더 구조
- `index.html` 화면 구조
- `scss/` **스타일은 여기서 수정하세요** (`style.scss`가 시작점)
- `css/style.css` scss를 컴파일한 결과 (앱이 실제로 읽는 파일, 직접 수정 X)
- `js/app.js` 동작 코드
- `fonts/` G마켓 산스 폰트

## scss 수정 후 css 만들기
컴퓨터에 Node.js가 설치되어 있어야 해요.

    npm install       (처음 한 번만)
    npm run build     (css/style.css 만들기)
    npm run watch     (scss를 저장할 때마다 자동으로 css 만들기)

## 자주 바꾸는 곳
- 카드 색상, 배경 테마 색: `scss/_themes.scss` (테마는 배경만 바뀌고 카드 모양은 모두 같아요)
- 둥근 모서리, 하트/반짝이 색, 체크무늬 크기: `scss/_variables.scss`
- 폰트, 앱 폭: `scss/_variables.scss`

## 내 사진 배경
앱에서 🎨 버튼 → "내 사진"을 누르면 폰에 있는 사진을 골라 배경으로 쓸 수 있어요.
고른 사진은 앱 안에만 저장돼요. (코드: `js/app.js`의 "내 사진 배경" 부분, 색: `scss/_themes.scss`의 "custom")
