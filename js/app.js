  const KEY = "checklist-app-v1";
  const THEME_KEY = "checklist-theme";
  const THEME_COLORS = { "check-sky":"#ffffff", "check-pink":"#ffffff", "check-red":"#161616", sea:"#0b1d3a", white:"#f6f6f6", black:"#0d0d0d", blue:"#cfe3fb", cobalt:"#0261ef", pink:"#ffb3b0", orange:"#ffa462", green:"#dcf1c4", custom:"#2b2b2b" };
  let data = { lists: [] };   // { id, name, items:[{ id, text, done, due, memo }] }
  let currentId = null;       // 열린 리스트
  let itemId = null;          // 열린 항목
  let selectMode = false;     // 선택 삭제 모드
  const selected = new Set(); // 선택된 항목 id
  const VIEWALL_KEY = "checklist-view-all";
  let viewAll = false;        // 홈에서 모든 리스트의 항목을 펼쳐 보기
  try { viewAll = localStorage.getItem(VIEWALL_KEY) === "1"; } catch (e) {}

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) data = JSON.parse(raw); }
    catch (e) { data = { lists: [] }; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const $ = (id) => document.getElementById(id);
  const current = () => data.lists.find(l => l.id === currentId);
  const currentItem = () => { const l = current(); return l && l.items.find(i => i.id === itemId); };
  const esc = (s) => s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  /* ---------- 테마 ---------- */
  function applyTheme(name) {
    if (name === "cute" || name === "check") name = "check-sky";   // 예전 이름
    if (name === "check-coral") name = "check-red";                  // 예전 이름
    if (!THEME_COLORS[name]) name = "check-sky";
    document.documentElement.setAttribute("data-theme", name);
    $("metaTheme").setAttribute("content", THEME_COLORS[name]);
    document.querySelectorAll("[data-theme-pick]").forEach(b =>
      b.setAttribute("aria-pressed", b.dataset.themePick === name));
    try { localStorage.setItem(THEME_KEY, name); } catch (e) {}
    refreshBgActions();
    applyCheckboxImages(); applyIcons();
  }

  /* ---------- 체크박스 그림 ---------- */
  // js/checkbox-svg.js 에 SVG 가 들어 있으면 체크박스를 그 그림으로 바꿔요.
  // SVG 안의 currentColor 는 지금 테마의 포인트 색(accent)으로 칠해져요.
  function applyCheckboxImages() {
    const svg = window.CHECKBOX_SVG;
    const root = document.documentElement;
    if (!svg || !svg.off || !svg.on) { root.classList.remove("has-checkimg"); return; }
    const accent = getComputedStyle(root).getPropertyValue("--accent").trim() || "#000";
    const ink = getComputedStyle(root).getPropertyValue("--btn-ink").trim() || "#fff";
    const toUrl = (s) => 'url("data:image/svg+xml,' + encodeURIComponent(s.replace(/currentColor/g, accent).replace(/#ffffff/gi, ink)) + '")';
    root.style.setProperty("--cb-off", toUrl(svg.off));
    root.style.setProperty("--cb-on", toUrl(svg.on));
    root.classList.add("has-checkimg");
  }

  // 아이콘 (images/back, close, add, select .svg) — 있는 것만 그림으로 바꿔요.
  // 뒤로가기·선택은 글자색(ink), 닫기·사진추가는 보조 글자색(muted), 닫기를 누르는 순간엔 danger 색이에요.
  function applyIcons() {
    const ic = window.ICON_SVG || {};
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const col = (v, d) => cs.getPropertyValue(v).trim() || d;
    const toUrl = (s, c) => 'url("data:image/svg+xml,' + encodeURIComponent(s.replace(/currentColor/g, c)) + '")';
    const colors = { back: col("--ink", "#000"), select: col("--ink", "#000"), close: col("--muted", "#666"), add: col("--muted", "#666") };
    for (const name of ["back", "close", "add", "select"]) {
      const on = !!ic[name];
      root.classList.toggle("has-ic-" + name, on);
      if (on) root.style.setProperty("--ic-" + name, toUrl(ic[name], colors[name]));
    }
    if (ic.close) root.style.setProperty("--ic-close-hot", toUrl(ic.close, col("--danger", "#c00")));
  }

  /* ---------- 마감일 ---------- */
  function dayDiff(due) {
    const [y, m, d] = due.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target - today) / 86400000);
  }
  function dueText(due) {
    const diff = dayDiff(due);
    const [, m, d] = due.split("-").map(Number);
    const date = `${m}/${d}`;
    if (diff < 0) return { cls: "over", text: `${Math.abs(diff)}일 지남 · ${date}` };
    if (diff === 0) return { cls: "soon", text: `오늘 · ${date}` };
    if (diff === 1) return { cls: "soon", text: `내일 · ${date}` };
    return { cls: "", text: `D-${diff} · ${date}` };
  }
  const overdueCount = (l) => l.items.filter(i => !i.done && i.due && dayDiff(i.due) < 0).length;

  /* ---------- 화면 그리기 ---------- */
  function renderHome() {
    const box = $("lists");
    if (!data.lists.length) {
      box.innerHTML = '<div class="empty">아직 체크리스트가 없어요.<br>위에서 이름을 입력하고 만들어보세요.</div>';
      return;
    }
    $("viewAllToggle").setAttribute("aria-checked", viewAll);
    box.classList.toggle("view-all", viewAll);
    // 고정된 리스트는 항상 맨 위에 (고정끼리는 저장된 순서대로)
    const shown = [...data.lists.filter(l => l.pinned), ...data.lists.filter(l => !l.pinned)];
    box.innerHTML = shown.map(l => {
      const done = l.items.filter(i => i.done).length;
      const pct = l.items.length ? Math.round(done / l.items.length * 100) : 0;
      const over = overdueCount(l);
      const mini = (i) => `<div class="mini ${i.done ? "done" : ""}" data-mini="${i.id}">
          <span class="t">${esc(i.text)}</span>
        </div>`;
      const inner = viewAll
        ? `<div class="minis">${l.items.length ? [...l.items.filter(i => !i.done), ...l.items.filter(i => i.done)].map(mini).join("") : '<div class="mini-empty">아직 항목이 없어요</div>'}</div>`
        : "";
      return `<div class="list-card" data-lid="${l.id}" data-group="${l.pinned ? "pin" : "l"}">
        <div class="card-head">
          <button class="grow" data-open="${l.id}">
            <div class="name">${esc(l.name)}</div>
            <div class="bar"><i style="width:${pct}%"></i></div>
            ${over ? `<div class="warn">기한 지난 항목 ${over}개</div>` : ""}
          </button>
          <span class="count">${done}/${l.items.length}</span>
          <button class="pin ${l.pinned ? "on" : ""}" data-pin="${l.id}" aria-pressed="${!!l.pinned}" aria-label="${l.pinned ? "상단 고정 해제" : "상단에 고정"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg></button>
          ${l.pinned ? "" : '<button class="drag" aria-label="순서 바꾸기"></button>'}
          <button class="icon del" data-del="${l.id}" aria-label="리스트 삭제"><i class="ico ico-close"></i></button>
        </div>${inner}
      </div>`;
    }).join("");
  }

  function renderDetail() {
    const l = current();
    if (!l) return showHome();
    document.body.classList.toggle("selecting", selectMode);
    const allSelected = l.items.length > 0 && l.items.every(i => selected.has(i.id));
    $("detailTitle").textContent = selectMode ? `${selected.size}개 선택` : l.name;
    $("back").innerHTML = '<i class="ico ico-back"></i>';
    $("selBtn").innerHTML = selectMode ? (allSelected ? "전체 해제" : "전체 선택") : '<i class="ico ico-select"></i>';
    $("selBtn").classList.toggle("hidden", !l.items.length);
    $("addArea").classList.toggle("hidden", selectMode);
    $("selBar").classList.toggle("hidden", !selectMode);
    $("selDelete").textContent = `선택 항목 삭제 (${selected.size})`;
    $("selDelete").disabled = !selected.size;
    const box = $("items");
    if (!l.items.length) {
      box.innerHTML = '<div class="empty">할 일을 추가해보세요.</div>';
      return;
    }
    const row = (i) => {
      const chips = [];
      if (i.due) { const t = dueText(i.due); chips.push(`<span class="chip ${i.done ? "" : t.cls}">${t.text}</span>`); }
      const sel = selected.has(i.id);
      const lead = selectMode
        ? `<div class="selwrap"><span class="selmark">${sel ? "✓" : ""}</span></div>`
        : `<label class="chk"><input type="checkbox" data-check="${i.id}" ${i.done ? "checked" : ""} aria-label="완료"></label>`;
      return `<div class="item ${i.done ? "done" : ""} ${sel ? "selected" : ""}" data-open-item="${i.id}" data-group="${i.done ? "done" : "todo"}">
        ${lead}
        <div class="main">
          <div class="title">${esc(i.text)}</div>
          ${chips.length ? `<div class="meta">${chips.join("")}</div>` : ""}
        </div>
        ${selectMode ? "" : '<button class="drag" aria-label="순서 바꾸기"></button>'}
      </div>`;
    };
    const todo = l.items.filter(i => !i.done);
    const done = l.items.filter(i => i.done);
    box.innerHTML = todo.map(row).join("") +
      (done.length ? `<div class="section-title">완료된 항목 (${done.length})</div>` + done.map(row).join("") : "");
  }

  function fillItemView() {
    const it = currentItem();
    if (!it) return;
    $("vDone").checked = it.done;
    $("vText").value = it.text;
    $("vDue").value = it.due || "";
    $("vMemo").value = it.memo || "";
  }

  function hideAll() { ["home", "detail", "itemView"].forEach(id => $(id).classList.add("hidden")); }
  function showHome() {
    selectMode = false; selected.clear(); document.body.classList.remove("selecting");
    currentId = null; itemId = null;
    hideAll(); $("home").classList.remove("hidden"); renderHome();
  }
  function showList(id, push) {
    if (push) history.pushState({ v: "list" }, "");
    currentId = id; itemId = null; selectMode = false; selected.clear();
    hideAll(); $("detail").classList.remove("hidden"); renderDetail();
  }
  function showItem(id) {
    history.pushState({ v: "item" }, "");
    itemId = id;
    hideAll(); $("itemView").classList.remove("hidden"); fillItemView();
    window.scrollTo(0, 0);
  }
  function closeItem() {
    const it = currentItem();
    if (it && !it.text.trim()) { it.text = "(제목 없음)"; save(); }
    itemId = null;
    hideAll(); $("detail").classList.remove("hidden"); renderDetail();
  }

  /* ---------- 동작: 리스트 ---------- */
  function addList() {
    const name = $("newList").value.trim();
    if (!name) return;
    data.lists.unshift({ id: uid(), name, items: [] });
    $("newList").value = "";
    save(); renderHome();
  }
  /* ---------- 예/아니오 확인 팝업 ---------- */
  const confirmOv = $("confirmOv");
  let confirmCb = null, pendingYes = null, pendingNo = false;
  function askConfirm(msg, onYes, yesLabel = "예", noLabel = "아니오") {
    $("confirmMsg").textContent = msg;
    $("confirmYes").textContent = yesLabel;
    $("confirmNo").textContent = noLabel;
    confirmCb = onYes;
    confirmOv.classList.remove("hidden");
    history.pushState({ v: "confirm" }, "");   // 안드로이드 뒤로가기 = 아니오
    $("confirmNo").focus();
  }
  function closeConfirm(yes) {
    if (confirmOv.classList.contains("hidden")) return;
    confirmOv.classList.add("hidden");
    if (yes) pendingYes = confirmCb; else pendingNo = true;
    confirmCb = null;
    history.back();   // 팝업용 기록을 지우고, '예'면 그 다음에 동작을 실행해요
  }
  $("confirmYes").onclick = () => closeConfirm(true);
  $("confirmNo").onclick = () => closeConfirm(false);
  confirmOv.addEventListener("click", e => { if (e.target === confirmOv) closeConfirm(false); });

  function deleteList(id) {
    const l = data.lists.find(x => x.id === id);
    if (!l) return;
    askConfirm(`"${l.name}" 리스트를 삭제할까요?`, () => {
      const inside = !!currentId;
      data.lists = data.lists.filter(x => x.id !== id);
      save();
      if (inside) history.back(); else renderHome();
    });
  }
  $("addList").onclick = addList;
  $("newList").onkeydown = e => { if (e.key === "Enter") addList(); };
  $("lists").onclick = e => {
    if (e.target.closest(".drag")) return;
    const mini = e.target.closest("[data-mini]");
    if (mini && !e.target.closest(".chk")) {          // 펼친 항목을 누르면 그 항목 상세로
      const lid = mini.closest("[data-lid]").dataset.lid;
      showList(lid, true); showItem(mini.dataset.mini);
      return;
    }
    if (mini) return;
    const pin = e.target.closest("[data-pin]");
    if (pin) {                                          // 상단 고정 켜기/끄기
      const l = data.lists.find(x => x.id === pin.dataset.pin);
      if (l) {
        l.pinned = !l.pinned;
        if (l.pinned) {                                 // 새로 고정한 건 고정된 것들 맨 아래에
          data.lists = data.lists.filter(x => x !== l);
          const last = data.lists.map(x => !!x.pinned).lastIndexOf(true);
          data.lists.splice(last + 1, 0, l);
        }
        save(); renderHome();
      }
      return;
    }
    const del = e.target.closest("[data-del]");
    const open = e.target.closest("[data-open]");
    if (del) deleteList(del.dataset.del);
    else if (open) showList(open.dataset.open, true);
  };
  $("back").onclick = () => history.back();   // 선택 모드에서는 "취소"
  $("detailTitle").onclick = () => {          // 제목을 누르면 이름 변경
    if (selectMode) return;
    const l = current();
    const name = prompt("리스트 이름 변경", l.name);
    if (name && name.trim()) { l.name = name.trim(); save(); renderDetail(); }
  };

  /* ---------- 선택 삭제 ---------- */
  function enterSelect() {
    history.pushState({ v: "select" }, "");
    selectMode = true; selected.clear(); renderDetail();
  }
  function exitSelect() {
    selectMode = false; selected.clear(); renderDetail();
  }
  $("selBtn").onclick = () => {
    if (!selectMode) return enterSelect();
    const l = current();
    const all = l.items.every(i => selected.has(i.id));
    selected.clear();
    if (!all) l.items.forEach(i => selected.add(i.id));
    renderDetail();
  };
  $("selDelete").onclick = () => {
    const n = selected.size;
    if (!n) return;
    askConfirm(`선택한 ${n}개 항목을 삭제할까요?`, () => {
      const l = current();
      l.items = l.items.filter(i => !selected.has(i.id));
      save();
      history.back();      // 선택 모드 종료
    });
  };

  /* ---------- 동작: 항목 ---------- */
  function addItem() {
    const text = $("newItem").value.trim();
    const l = current();
    if (!text || !l) return;
    l.items.push({ id: uid(), text, done: false, due: "", memo: "" });
    $("newItem").value = "";
    save(); renderDetail();
  }
  $("addItem").onclick = addItem;
  $("newItem").onkeydown = e => { if (e.key === "Enter") addItem(); };

  $("items").onclick = e => {
    if (e.target.closest(".drag")) return;
    if (e.target.closest(".chk")) return;            // 체크박스 영역은 체크만
    const row = e.target.closest("[data-open-item]");
    if (!row) return;
    const id = row.dataset.openItem;
    if (selectMode) {                                 // 선택 모드: 항목 선택/해제
      selected.has(id) ? selected.delete(id) : selected.add(id);
      renderDetail();
    } else {
      showItem(id);                                   // 나머지 영역은 상세 열기
    }
  };
  $("items").onchange = e => {
    const id = e.target.dataset.check;
    if (!id) return;
    const it = current().items.find(i => i.id === id);
    if (!it) return;
    it.done = e.target.checked; save();
    const row = e.target.closest(".item");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !row || !row.animate) { renderDetail(); return; }
    // 살짝 사라졌다가 새 자리에서 나타나기
    row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out", fill: "forwards" }).onfinish = () => {
      renderDetail();
      const moved = document.querySelector(`#items .item[data-open-item="${id}"]`);
      if (moved && moved.animate) moved.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-in" });
    };
  };

  /* ---------- 동작: 항목 상세 ---------- */
  $("backItem").onclick = () => history.back();
  $("vDone").onchange = e => { const it = currentItem(); it.done = e.target.checked; save(); };
  $("vText").oninput = e => { const it = currentItem(); it.text = e.target.value; save(); };
  $("vDue").onchange = e => { const it = currentItem(); it.due = e.target.value || ""; save(); };
  $("vDueClear").onclick = () => { const it = currentItem(); it.due = ""; $("vDue").value = ""; save(); };
  $("vMemo").oninput = e => { const it = currentItem(); it.memo = e.target.value; save(); };
  $("vDelete").onclick = () => {
    askConfirm("이 항목을 삭제할까요?", () => {
      const l = current();
      l.items = l.items.filter(i => i.id !== itemId);
      itemId = null; save();
      history.back();
    });
  };

  /* ---------- 앱 제목 수정 (더블클릭 / 더블탭) ---------- */
  const TITLE_KEY = "checklist-app-title";
  const DEFAULT_TITLE = "내 체크리스트";
  const titleEl = $("appTitle");
  try { titleEl.textContent = localStorage.getItem(TITLE_KEY) || DEFAULT_TITLE; } catch (e) {}

  function editTitle() {
    if (titleEl.classList.contains("hidden")) return;
    const input = document.createElement("input");
    input.type = "text"; input.id = "appTitleInput"; input.maxLength = 30;
    input.value = titleEl.textContent;
    input.setAttribute("aria-label", "체크리스트 제목");
    titleEl.classList.add("hidden");
    titleEl.after(input);
    input.focus(); input.select();
    let done = false;
    const finish = (ok) => {
      if (done) return; done = true;
      if (ok) {
        const v = input.value.trim() || DEFAULT_TITLE;
        titleEl.textContent = v;
        try { localStorage.setItem(TITLE_KEY, v); } catch (e) {}
      }
      input.remove(); titleEl.classList.remove("hidden");
    };
    input.onkeydown = e => { if (e.key === "Enter") finish(true); else if (e.key === "Escape") finish(false); };
    input.onblur = () => finish(true);
  }
  titleEl.ondblclick = editTitle;
  let lastTap = 0;                                   // 폰에서 두 번 연속 탭 감지
  titleEl.addEventListener("touchend", e => {
    const now = Date.now();
    if (now - lastTap < 350) { e.preventDefault(); lastTap = 0; editTitle(); }
    else lastTap = now;
  });

  /* ---------- 테마 버튼 아이콘 (images/icon-theme.png 가 있으면 🎨 대신 사용) ---------- */
  (function () {
    const im = new Image();
    im.onload = () => { const b = $("themeBtn"); b.textContent = ""; im.alt = "배경 선택"; im.className = "icon-img"; b.appendChild(im); };
    im.src = "images/icon-theme.png";
  })();

  /* ---------- 내 사진 배경 (폰에서 고른 사진을 배경으로) ---------- */
  // 사진은 크기를 줄여서 앱 안(IndexedDB)에 저장해요. 인터넷으로 보내지 않아요.
  const BG_DB = "checklist-bg", BG_STORE = "files", BG_KEY = "bg";
  let bgUrl = null;   // 지금 쓰는 사진의 주소 (blob:)

  function idbDo(mode, fn) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open(BG_DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(BG_STORE);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction(BG_STORE, mode);
        const req = fn(tx.objectStore(BG_STORE));
        tx.oncomplete = () => resolve(req && req.result);
        tx.onerror = () => reject(tx.error);
      };
    });
  }
  const bgGet = () => idbDo("readonly", s => s.get(BG_KEY));
  const bgPut = (blob) => idbDo("readwrite", s => s.put(blob, BG_KEY));
  const bgDel = () => idbDo("readwrite", s => s.delete(BG_KEY));

  // 사진이 너무 크면 긴 쪽을 2400px 이하로 줄여요 (폰 화면에는 충분해요)
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? resolve(b) : reject(new Error("toBlob")), "image/jpeg", 0.88);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
      img.src = url;
    });
  }

  function showBg(blob) {
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    bgUrl = URL.createObjectURL(blob);
    document.documentElement.style.setProperty("--user-bg", `url("${bgUrl}")`);
    const sw = $("customSwatch");
    sw.style.backgroundImage = `url("${bgUrl}")`; sw.textContent = ""; sw.classList.add("has-photo");
    refreshBgActions();
  }
  function clearBg() {
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    bgUrl = null;
    document.documentElement.style.removeProperty("--user-bg");
    const sw = $("customSwatch");
    sw.style.backgroundImage = ""; sw.textContent = "＋"; sw.classList.remove("has-photo");
    refreshBgActions();
  }
  function refreshBgActions() {
    const on = document.documentElement.dataset.theme === "custom" && !!bgUrl;
    $("customActions").classList.toggle("hidden", !on);
  }
  function pickBg() { $("bgFile").value = ""; $("bgFile").click(); }

  /* ---------- 사진 자르기 ---------- */
  const cropOv = $("cropOv"), cropImg = $("cropImg"), cropBox = $("cropBox"), cropStage = $("cropStage");
  let cropUrl = null, cropPending = false, ratio = null, dw = 0, dh = 0;
  let box = { x: 0, y: 0, w: 0, h: 0 };
  const MIN = 40;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function drawBox() {
    cropBox.style.left = box.x + "px"; cropBox.style.top = box.y + "px";
    cropBox.style.width = box.w + "px"; cropBox.style.height = box.h + "px";
  }
  function setRatio(k) {
    ratio = k === "free" ? null : k === "screen" ? window.innerWidth / window.innerHeight : k === "1:1" ? 1 : 3 / 4;
    document.querySelectorAll("#cropRatios [data-ratio]").forEach(b => b.classList.toggle("on", b.dataset.ratio === k));
    let w = dw, h = dh;
    if (ratio) { if (w / h > ratio) w = h * ratio; else h = w / ratio; }
    w *= .9; h *= .9;
    box = { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
    drawBox();
  }
  function openCrop(file) {
    if (cropUrl) URL.revokeObjectURL(cropUrl);
    cropUrl = URL.createObjectURL(file);
    cropImg.onload = () => {
      cropOv.classList.remove("hidden");
      dw = cropImg.clientWidth; dh = cropImg.clientHeight;
      history.pushState({ v: "crop" }, "");           // 안드로이드 뒤로가기 = 자르기 취소
      setRatio("screen");
    };
    cropImg.onerror = () => alert("사진을 불러오지 못했어요. 다른 사진으로 다시 시도해 주세요.");
    cropImg.src = cropUrl;
  }
  function closeCrop() {
    if (cropOv.classList.contains("hidden")) return;
    cropOv.classList.add("hidden");
    cropPending = true;
    history.back();                                   // 자르기용 기록 지우기
    cropImg.removeAttribute("src");
    if (cropUrl) { URL.revokeObjectURL(cropUrl); cropUrl = null; }
  }

  cropBox.addEventListener("pointerdown", e => {
    e.preventDefault();
    const corner = e.target.dataset && e.target.dataset.c;
    const st = cropStage.getBoundingClientRect();
    const start = { ...box }, sx = e.clientX, sy = e.clientY;
    // 크기 조절: 반대쪽 모서리를 고정
    const ax = corner && corner.includes("l") ? start.x + start.w : start.x;
    const ay = corner && corner.includes("t") ? start.y + start.h : start.y;
    const move = ev => {
      if (!corner) {
        box.x = clamp(start.x + ev.clientX - sx, 0, dw - box.w);
        box.y = clamp(start.y + ev.clientY - sy, 0, dh - box.h);
      } else {
        const px = clamp(ev.clientX - st.left, 0, dw), py = clamp(ev.clientY - st.top, 0, dh);
        const right = px >= ax, down = py >= ay;
        if (!ratio) {
          box.w = Math.max(MIN, Math.abs(px - ax)); box.h = Math.max(MIN, Math.abs(py - ay));
        } else {
          const maxW = Math.min(right ? dw - ax : ax, (down ? dh - ay : ay) * ratio);
          box.w = clamp(Math.abs(px - ax), Math.min(MIN, maxW), maxW);
          box.h = box.w / ratio;
        }
        box.x = right ? ax : ax - box.w; box.y = down ? ay : ay - box.h;
        box.x = clamp(box.x, 0, dw - box.w); box.y = clamp(box.y, 0, dh - box.h);
      }
      drawBox();
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
  $("cropRatios").onclick = e => { const b = e.target.closest("[data-ratio]"); if (b) setRatio(b.dataset.ratio); };
  $("cropCancel").onclick = closeCrop;
  cropOv.addEventListener("click", e => { if (e.target === cropOv) closeCrop(); });
  $("cropOk").onclick = async () => {
    try {
      const s = cropImg.naturalWidth / dw;
      const sw = box.w * s, sh = box.h * s;
      const k = Math.min(1, 2400 / Math.max(sw, sh));          // 긴 쪽 2400px 이하로
      const c = document.createElement("canvas");
      c.width = Math.round(sw * k); c.height = Math.round(sh * k);
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(cropImg, box.x * s, box.y * s, sw, sh, 0, 0, c.width, c.height);
      const blob = await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("toBlob")), "image/jpeg", 0.88));
      await bgPut(blob);
      showBg(blob);
      applyTheme("custom");
      modal.classList.add("hidden");
      closeCrop();
    } catch (err) {
      alert("사진을 저장하지 못했어요. 다시 시도해 주세요.");
    }
  };

  // 갤러리(사진 선택 화면)에서 고른 사진을 자르기 화면으로
  $("bgFile").onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) openCrop(file);
  };
  $("bgChange").onclick = pickBg;
  $("bgRemove").onclick = async () => {
    askConfirm("내 사진 배경을 지울까요?", async () => {
      try { await bgDel(); } catch (err) {}
      clearBg();
      applyTheme("check-sky");
    });
  };

  /* ---------- 테마 팝업 ---------- */
  const modal = $("themeModal");
  $("themeBtn").onclick = () => modal.classList.remove("hidden");
  $("themeClose").onclick = () => modal.classList.add("hidden");
  modal.onclick = e => {
    if (e.target === modal) modal.classList.add("hidden");
    const b = e.target.closest("[data-theme-pick]");
    if (!b) return;
    const name = b.dataset.themePick;
    if (name === "custom" && !bgUrl) pickBg();   // 사진이 아직 없으면 사진 고르기
    else applyTheme(name);
  };

  /* ---------- 순서 바꾸기 (손잡이를 잡고 끌기) ---------- */
  function makeSortable(container, rowSel, idAttr, onCommit) {
    container.addEventListener("pointerdown", e => {
      const handle = e.target.closest(".drag");
      if (!handle || (e.pointerType === "mouse" && e.button !== 0)) return;
      const row = handle.closest(rowSel);
      if (!row) return;
      e.preventDefault();
      // 끄는 동안 항목은 실제로 옮기지 않고 위치만 살짝 밀어요(터치가 끊기지 않게). 놓을 때 한 번에 바꿔요.
      const all = [...container.querySelectorAll(rowSel)];
      const group = all.filter(r => r.dataset.group === row.dataset.group);
      const i0 = group.indexOf(row);
      const sy0 = window.scrollY;
      const tops = group.map(r => r.getBoundingClientRect().top + sy0);   // 문서 기준 원래 위치
      const mids = group.map((r, i) => tops[i] + r.offsetHeight / 2);
      const cs = getComputedStyle(row);
      const step = row.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
      const grab = e.clientY - (tops[i0] - sy0);
      let target = i0;
      row.classList.add("dragging");
      const move = ev => {
        if (ev.clientY < 70) window.scrollBy(0, -12);
        else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
        const top = ev.clientY + window.scrollY - grab;          // 끌고 있는 항목의 문서 기준 위치
        const center = top + row.offsetHeight / 2;
        target = 0;
        mids.forEach((m, i) => { if (i !== i0 && m < center) target++; });
        // others before i0 that are above count normally; adjust for removed row
        target = Math.min(target, group.length - 1);
        row.style.transform = `translateY(${top - tops[i0]}px)`;
        group.forEach((r, i) => {
          if (r === row) return;
          let dy = 0;
          if (i0 < target && i > i0 && i <= target) dy = -step;
          else if (i0 > target && i < i0 && i >= target) dy = step;
          r.style.transform = dy ? `translateY(${dy}px)` : "";
        });
      };
      const end = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        group.forEach(r => { r.style.transform = ""; });
        row.classList.remove("dragging");
        if (target === i0) return;
        const ids = group.map(r => r.dataset[idAttr]);
        ids.splice(target, 0, ids.splice(i0, 1)[0]);
        let k = 0;
        onCommit(all.map(r => r.dataset.group === row.dataset.group ? ids[k++] : r.dataset[idAttr]));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    });
  }
  const byOrder = (arr, ids) => ids.map(id => arr.find(x => x.id === id)).filter(Boolean);
  makeSortable($("lists"), ".list-card", "lid", ids => { data.lists = byOrder(data.lists, ids); save(); renderHome(); });
  makeSortable($("items"), ".item", "openItem", ids => { const l = current(); l.items = byOrder(l.items, ids); save(); renderDetail(); });

  /* ---------- 전체 보기 켜기/끄기 ---------- */
  $("viewAllToggle").onclick = () => {
    viewAll = !viewAll;
    try { localStorage.setItem(VIEWALL_KEY, viewAll ? "1" : "0"); } catch (e) {}
    renderHome();
  };
  $("lists").onchange = e => {                          // 펼친 목록에서 바로 체크
    const id = e.target.dataset.mcheck;
    if (!id) return;
    const l = data.lists.find(x => x.id === e.target.closest("[data-lid]").dataset.lid);
    const it = l && l.items.find(i => i.id === id);
    if (!it) return;
    it.done = e.target.checked; save(); renderHome();
  };

  /* ---------- 뒤로가기(안드로이드) ---------- */
  history.replaceState({ v: "home" }, "");
  window.addEventListener("popstate", () => {
    if (noticePending) { noticePending = false; return; }
    if (!noticeOv.classList.contains("hidden")) { hideNoticeFlag(); noticeOv.classList.add("hidden"); return; }   // 뒤로가기 = 닫기
    if (cropPending) { cropPending = false; return; }                                                  // 자르기 창을 버튼으로 닫은 경우
    if (!cropOv.classList.contains("hidden")) { closeCropByBack(); return; }                           // 뒤로가기 = 자르기 취소
    if (!confirmOv.classList.contains("hidden")) { confirmOv.classList.add("hidden"); confirmCb = null; return; }  // 뒤로가기 = 아니오
    if (pendingYes) { const cb = pendingYes; pendingYes = null; cb(); return; }
    if (pendingNo) { pendingNo = false; return; }
    if (!modal.classList.contains("hidden")) modal.classList.add("hidden");
    if (selectMode) exitSelect();
    else if (itemId) closeItem();
    else if (currentId) showHome();
  });

  /* ---------- 업데이트 안내 팝업 ---------- */
  // 새 안내를 보여주고 싶을 때는 NOTICE_ID 를 새 값(날짜 등)으로 바꾸세요. "다시 보지 않기"를 했던 사람에게도 한 번 더 보여요.
  const NOTICE_ID = "2026-10-15", NOTICE_KEY = "checklist-notice-hide";
  const noticeOv = $("noticeOv");
  let noticePending = false;
  function hideNoticeFlag() {
    try { if ($("noticeHide").checked) localStorage.setItem(NOTICE_KEY, NOTICE_ID); } catch (e) {}
  }
  function closeNotice() {
    if (noticeOv.classList.contains("hidden")) return;
    hideNoticeFlag();
    noticeOv.classList.add("hidden");
    noticePending = true;
    history.back();
  }
  $("noticeClose").onclick = closeNotice;
  (function showNotice() {
    let seen = null;
    try { seen = localStorage.getItem(NOTICE_KEY); } catch (e) {}
    if (seen === NOTICE_ID) return;
    $("noticeHide").checked = false;
    noticeOv.classList.remove("hidden");
    history.pushState({ v: "notice" }, "");            // 안드로이드 뒤로가기 = 닫기
  })();

  function closeCropByBack() {
    cropOv.classList.add("hidden");
    cropImg.removeAttribute("src");
    if (cropUrl) { URL.revokeObjectURL(cropUrl); cropUrl = null; }
  }

  // 안드로이드 기기의 뒤로가기 버튼: 홈이면 앱 종료, 아니면 이전 화면(위 popstate 처리)으로
  const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (CapApp && CapApp.addListener) {
    CapApp.addListener("backButton", () => {
      if (!noticeOv.classList.contains("hidden")) return closeNotice();
      if (!cropOv.classList.contains("hidden")) return closeCrop();
      if (confirmOv.classList.contains("hidden") && !modal.classList.contains("hidden")) { modal.classList.add("hidden"); return; }   // 배경 팝업 닫기
      const atHome = !currentId && !itemId && !selectMode
        && modal.classList.contains("hidden") && confirmOv.classList.contains("hidden");
      if (atHome) CapApp.exitApp(); else history.back();
    });
  }

  /* ---------- 새 버전 알림 ---------- */
  // GitHub 저장소의 "최신 릴리스"를 열 때마다 확인해서, 내 버전보다 새 버전이면 팝업을 띄워요.
  // (저장소가 Public 일 때만 확인할 수 있어요. 확인에 실패하면 아무것도 안 하고 넘어가요.)
  const UPDATE_REPO = "parkhyoyoung/checklist";
  const verParts = (v) => String(v).replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
  function isNewer(latest, current) {
    const a = verParts(latest), b = verParts(current);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
    }
    return false;
  }
  async function checkUpdate() {
    if (!window.APP_VERSION || !UPDATE_REPO) return;
    try {
      const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) return;
      const rel = await res.json();
      const latest = String(rel.tag_name || "").replace(/^v/i, "");
      if (!latest || !isNewer(latest, window.APP_VERSION)) return;
      const apk = (rel.assets || []).find(a => /\.apk$/i.test(a.name));
      const url = (apk && apk.browser_download_url) || rel.html_url;
      askConfirm(`새 버전이 있어요 (v${latest})\n지금 받을까요?`, () => { window.open(url, "_blank"); }, "받기", "나중에");
    } catch (e) { /* 인터넷이 없거나 확인할 수 없으면 조용히 넘어가요 */ }
  }

  load();
  let saved = "sea";
  try { saved = localStorage.getItem(THEME_KEY) || "sea"; } catch (e) {}
  applyTheme(saved);
  setTimeout(checkUpdate, 1500);
  // 저장해 둔 내 사진이 있으면 불러오고, 없는데 내 사진 테마였다면 기본 테마로 돌아가요
  bgGet().then(blob => {
    if (blob) showBg(blob);
    else if (document.documentElement.dataset.theme === "custom") applyTheme("check-sky");
  }).catch(() => {
    if (document.documentElement.dataset.theme === "custom") applyTheme("check-sky");
  });
  renderHome();
