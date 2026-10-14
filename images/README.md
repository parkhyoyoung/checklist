# 직접 그린 그림 넣는 곳

아래 이름으로 PNG 파일을 이 폴더에 넣으면 자동으로 적용돼요.
파일이 없으면 기본 색/무늬/이모지가 그대로 보여요.
(그림을 넣은 뒤에는 앱 파일(APK)을 다시 만들어야 폰에 반영돼요.)

| 파일 이름 | 용도 | 추천 크기 |
|---|---|---|
| `bg-check-sky.png` `bg-check-pink.png` `bg-check-red.png` `bg-white.png` `bg-black.png` `bg-blue.png` `bg-cobalt.png` `bg-pink.png` `bg-orange.png` `bg-green.png` | 배경 (바둑판처럼 반복되는 무늬 한 장) | 360 × 360 px |
| `bg-sea.png` (또는 `bg-sea.jpg`) | **밤바다** 배경 — 반복 없이 화면 가득 채워지는 그림 | 1080 × 2400 px |
| `swatch-check-sky.png` ... (위와 같은 테마 이름) | 배경 선택 팝업의 동그란 미리보기 | 132 × 132 px |
| `checkbox.svg` + `checkbox-checked.svg` (둘 다 있어야 적용) | 체크박스 그림 (체크 전 / 체크 후). SVG, 정사각형, 배경 투명. **넣은 뒤 `npm run build` 를 꼭 실행하세요.** SVG 안에서 `currentColor` 로 칠한 부분은 테마 색으로 바뀌어요 | viewBox `0 0 48 48` 추천 (화면에서는 24px로 보여요) |
| `icon-theme.png` | 오른쪽 아래 떠 있는 배경 선택 버튼 아이콘 (🎨 대신) | 84 × 84 px, 배경 투명 |
