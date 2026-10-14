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

## APK 만들기 (GitHub Actions — 내 컴퓨터에 안드로이드 도구를 깔지 않아도 돼요)

1. github.com 에 가입하고 새 저장소(Repository)를 만들어요. (Private 으로 해도 돼요)
2. 이 폴더 안의 파일을 **전부** 저장소에 올려요. (`node_modules` 폴더는 올리지 마세요)
   - `.github/workflows/build-apk.yml` 도 꼭 올라가야 해요. 점(.)으로 시작하는 폴더가 안 올라가면
     저장소에서 Add file → Create new file 로 `.github/workflows/build-apk.yml` 을 만들고 내용을 붙여넣어요.
3. 저장소의 **Actions** 탭 → "APK 만들기" → **Run workflow** 를 눌러요. (파일을 올리면 자동으로도 실행돼요)
4. 5~10분 뒤 초록색 체크가 뜨면 그 실행을 열어서 맨 아래 **Artifacts → checklist-apk** 를 내려받아요.
5. 압축을 풀면 `app-debug.apk` 가 나와요. 폰으로 옮겨서 설치해요. (출처를 알 수 없는 앱 설치 허용 필요)

- 앱 아이콘: `images/app-icon.png` (1024×1024 PNG) 를 넣으면 APK 에 적용돼요. 없으면 기본 아이콘이에요.
- 앱 이름과 ID 는 `capacitor.config.json` 에서 바꿀 수 있어요.
- 디자인을 고친 뒤에는 `npm run build` 로 CSS/SVG 를 만들고, 다시 파일을 올려서 Run workflow 를 해요.

## 새 버전 알림 / 업데이트

- 앱을 열 때마다 GitHub 저장소의 **최신 릴리스**를 확인해서, 내 버전보다 새 버전이면 "새 버전이 있어요" 팝업을 띄워요. (저장소가 **Public** 이어야 확인할 수 있어요)
- 새 버전을 내는 방법: `package.json` 의 `"version"` 을 올리고 (예: 1.0.0 → 1.0.1) 저장소에 올리면, 빌드가 끝나고 **Releases** 에 `checklist-v1.0.1.apk` 가 자동으로 올라가요.
- 저장소 주소를 바꾸면 `js/app.js` 의 `UPDATE_REPO` 값도 같이 바꿔요.
- 덮어쓰기 설치(데이터 유지)를 하려면 서명 키가 늘 같아야 해요. GitHub 저장소 Settings → Secrets and variables → Actions 에 `DEBUG_KEYSTORE_BASE64` 를 등록하세요.
