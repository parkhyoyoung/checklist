  const KEY = "checklist-app-v1";
  const THEME_KEY = "checklist-theme";
  const THEME_COLORS = { "check-sky":"#ffffff", "check-pink":"#ffffff", "check-red":"#161616", sea:"#0b1d3a", white:"#f6f6f6", black:"#0d0d0d", blue:"#cfe3fb", cobalt:"#0261ef", pink:"#ffb3b0", orange:"#ffa462", green:"#dcf1c4", custom:"#2b2b2b" };
  let data = { lists: [] };   // { id, name, items:[{ id, text, done, due, memo }] }
  let currentId = null;       // 열린 리스트
  let itemId = null;          // 열린 항목
  let selectMode = false;     // 선택 삭제 모드
  const selected = new Set(); // 선택된 항목 id

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
    box.innerHTML = data.lists.map(l => {
      const done = l.items.filter(i => i.done).length;
      const pct = l.items.length ? Math.round(done / l.items.length * 100) : 0;
      const over = overdueCount(l);
      return `<div class="list-card">
        <button class="grow" data-open="${l.id}">
          <div class="name">${esc(l.name)}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          ${over ? `<div class="warn">기한 지난 항목 ${over}개</div>` : ""}
        </button>
        <span class="count">${done}/${l.items.length}</span>
        <button class="icon del" data-del="${l.id}" aria-label="리스트 삭제"><i class="ico ico-close"></i></button>
      </div>`;
    }).join("");
  }

  function renderDetail() {
    const l = current();
    if (!l) return showHome();
    document.body.classList.toggle("selecting", selectMode);
    const allSelected = l.items.length > 0 && l.items.every(i => selected.has(i.id));
    $("detailTitle").textContent = selectMode ? `${selected.size}개 선택` : l.name;
    $("back").innerHTML = selectMode ? "취소" : '<i class="ico ico-back"></i>목록';
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
      return `<div class="item ${i.done ? "done" : ""} ${sel ? "selected" : ""}" data-open-item="${i.id}">
        ${lead}
        <div class="main">
          <div class="title">${esc(i.text)}</div>
          ${chips.length ? `<div class="meta">${chips.join("")}</div>` : ""}
        </div>
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
  function askConfirm(msg, onYes) {
    $("confirmMsg").textContent = msg;
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

  $("bgFile").onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const blob = await shrink(file);
      await bgPut(blob);
      showBg(blob);
      applyTheme("custom");
      modal.classList.add("hidden");
    } catch (err) {
      alert("사진을 불러오지 못했어요. 다른 사진으로 다시 시도해 주세요.");
    }
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

  /* ---------- 뒤로가기(안드로이드) ---------- */
  history.replaceState({ v: "home" }, "");
  window.addEventListener("popstate", () => {
    if (!confirmOv.classList.contains("hidden")) { confirmOv.classList.add("hidden"); confirmCb = null; return; }  // 뒤로가기 = 아니오
    if (pendingYes) { const cb = pendingYes; pendingYes = null; cb(); return; }
    if (pendingNo) { pendingNo = false; return; }
    if (!modal.classList.contains("hidden")) modal.classList.add("hidden");
    if (selectMode) exitSelect();
    else if (itemId) closeItem();
    else if (currentId) showHome();
  });

  load();
  let saved = "sea";
  try { saved = localStorage.getItem(THEME_KEY) || "sea"; } catch (e) {}
  applyTheme(saved);
  // 저장해 둔 내 사진이 있으면 불러오고, 없는데 내 사진 테마였다면 기본 테마로 돌아가요
  bgGet().then(blob => {
    if (blob) showBg(blob);
    else if (document.documentElement.dataset.theme === "custom") applyTheme("check-sky");
  }).catch(() => {
    if (document.documentElement.dataset.theme === "custom") applyTheme("check-sky");
  });
  renderHome();
