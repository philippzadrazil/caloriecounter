(() => {
  "use strict";

  const STORAGE_KEY = "cc_days_v1";

  /* ---------- storage ---------- */

  function loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("Could not read storage", e);
      return {};
    }
  }

  function saveAll(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let allDays = loadAll();

  function getDay(key) {
    return allDays[key] || {};
  }

  function setDayField(key, field, value) {
    const day = { ...allDays[key] };
    if (value === null || value === "" || Number.isNaN(value)) {
      delete day[field];
    } else {
      day[field] = value;
    }
    if (Object.keys(day).length === 0) {
      delete allDays[key];
    } else {
      allDays[key] = day;
    }
    saveAll(allDays);
  }

  /* ---------- date helpers ---------- */

  function toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function keyToDate(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function isSameDay(a, b) {
    return toKey(a) === toKey(b);
  }

  const weekdayFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short" });
  const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" });
  const dateFmtYear = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric" });

  function formatDayLabel(date) {
    const today = startOfDay(new Date());
    if (isSameDay(date, today)) return "Heute";
    if (isSameDay(date, addDays(today, -1))) return "Gestern";
    if (isSameDay(date, addDays(today, 1))) return "Morgen";
    const sameYear = date.getFullYear() === today.getFullYear();
    return `${weekdayFmt.format(date)}, ${(sameYear ? dateFmt : dateFmtYear).format(date)}`;
  }

  function formatShort(date) {
    return dateFmt.format(date);
  }

  /* ---------- state ---------- */

  let currentDate = startOfDay(new Date());
  let currentView = "view-entry";
  let currentRange = "30";

  /* ---------- entry view ---------- */

  const fields = ["weight", "breakfast", "lunch", "dinner", "snack", "resting", "active"];
  const inputs = {};
  fields.forEach((f) => (inputs[f] = document.getElementById(`f-${f}`)));

  const dayLabelBtn = document.getElementById("dayLabel");
  const datePicker = document.getElementById("datePicker");

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function renderEntry() {
    const key = toKey(currentDate);
    const day = getDay(key);
    dayLabelBtn.textContent = formatDayLabel(currentDate);
    datePicker.value = key;

    fields.forEach((f) => {
      const val = day[f];
      inputs[f].value = val === undefined ? "" : val;
    });

    updateSums();
  }

  function updateSums() {
    const intake =
      num(inputs.breakfast.value) +
      num(inputs.lunch.value) +
      num(inputs.dinner.value) +
      num(inputs.snack.value);
    const burned = num(inputs.resting.value) + num(inputs.active.value);
    const diff = intake - burned;

    document.getElementById("sum-intake").textContent = `${intake} kcal`;
    document.getElementById("sum-burned").textContent = `${burned} kcal`;
    document.getElementById("bal-intake").textContent = `${intake} kcal`;
    document.getElementById("bal-burned").textContent = `${burned} kcal`;

    const diffEl = document.getElementById("bal-diff");
    const diffLabel = document.getElementById("bal-diff-label");
    const diffVal = document.getElementById("bal-diff-value");

    diffEl.classList.remove("deficit", "surplus");
    if (diff <= 0) {
      diffEl.classList.add("deficit");
      diffLabel.textContent = "Defizit";
      diffVal.textContent = `${Math.abs(diff)} kcal`;
    } else {
      diffEl.classList.add("surplus");
      diffLabel.textContent = "Überschuss";
      diffVal.textContent = `${diff} kcal`;
    }
  }

  fields.forEach((f) => {
    inputs[f].addEventListener("input", () => {
      const key = toKey(currentDate);
      const raw = inputs[f].value;
      const value = raw === "" ? null : f === "weight" ? parseFloat(raw) : Math.round(parseFloat(raw));
      setDayField(key, f, value);
      updateSums();
    });
  });

  document.getElementById("prevDay").addEventListener("click", () => {
    currentDate = addDays(currentDate, -1);
    renderEntry();
  });
  document.getElementById("nextDay").addEventListener("click", () => {
    currentDate = addDays(currentDate, 1);
    renderEntry();
  });
  dayLabelBtn.addEventListener("click", () => {
    if (typeof datePicker.showPicker === "function") {
      datePicker.showPicker();
    } else {
      datePicker.focus();
      datePicker.click();
    }
  });
  datePicker.addEventListener("change", () => {
    if (datePicker.value) {
      currentDate = keyToDate(datePicker.value);
      renderEntry();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (currentView !== "view-entry") return;
    if (e.key === "ArrowLeft") {
      currentDate = addDays(currentDate, -1);
      renderEntry();
    } else if (e.key === "ArrowRight") {
      currentDate = addDays(currentDate, 1);
      renderEntry();
    }
  });

  /* swipe between days */
  (function setupSwipe() {
    const el = document.getElementById("entrySwipe");
    let startX = 0, startY = 0, tracking = false;

    el.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    el.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        currentDate = addDays(currentDate, dx < 0 ? 1 : -1);
        renderEntry();
      }
    }, { passive: true });
  })();

  /* ---------- list view ---------- */

  function computeDayTotals(day) {
    const intake =
      (day.breakfast || 0) + (day.lunch || 0) + (day.dinner || 0) + (day.snack || 0);
    const burned = (day.resting || 0) + (day.active || 0);
    return { intake, burned, diff: intake - burned };
  }

  function sortedKeys() {
    return Object.keys(allDays).sort();
  }

  function renderList() {
    const listEl = document.getElementById("dayList");
    const emptyEl = document.getElementById("listEmpty");
    const keys = sortedKeys().reverse();

    listEl.innerHTML = "";
    emptyEl.hidden = keys.length > 0;

    keys.forEach((key) => {
      const day = allDays[key];
      const { intake, burned, diff } = computeDayTotals(day);
      const row = document.createElement("button");
      row.className = "day-row";
      row.type = "button";

      const diffClass = diff <= 0 ? "diff-deficit" : "diff-surplus";
      const diffText = diff <= 0 ? `-${Math.abs(diff)}` : `+${diff}`;
      const weightText = day.weight !== undefined ? `${day.weight} kg` : "–";

      row.innerHTML = `
        <div class="day-row-date">
          <strong>${formatDayLabel(keyToDate(key))}</strong>
          <span>${weightText}</span>
        </div>
        <div class="day-row-stats">
          <div class="stat-col">
            <span>Aufnahme</span>
            <strong>${intake}</strong>
          </div>
          <div class="stat-col">
            <span>Verbrauch</span>
            <strong>${burned}</strong>
          </div>
          <div class="stat-col ${diffClass}">
            <span>Bilanz</span>
            <strong>${diffText}</strong>
          </div>
        </div>
      `;
      row.addEventListener("click", () => {
        currentDate = keyToDate(key);
        renderEntry();
        switchView("view-entry");
      });
      listEl.appendChild(row);
    });
  }

  /* ---------- chart view ---------- */

  const SVG_NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function getRangeDays() {
    const keys = sortedKeys();
    if (currentRange === "all") {
      return keys.map((key) => ({ key, ...allDays[key] }));
    }
    const n = parseInt(currentRange, 10);
    const today = startOfDay(new Date());
    const start = addDays(today, -(n - 1));
    const result = [];
    for (let d = start; d <= today; d = addDays(d, 1)) {
      const key = toKey(d);
      result.push({ key, ...(allDays[key] || {}) });
    }
    return result;
  }

  function renderBarChart(days) {
    const container = document.getElementById("calChart");
    container.innerHTML = "";
    if (days.length === 0) return;

    const slot = days.length > 40 ? 18 : days.length > 15 ? 26 : 40;
    const width = Math.max(days.length * slot, 280);
    const height = 200;
    const padBottom = 26;
    const padTop = 10;
    const chartH = height - padBottom - padTop;

    const values = days.map((d) => {
      const intake = (d.breakfast || 0) + (d.lunch || 0) + (d.dinner || 0) + (d.snack || 0);
      const burned = (d.resting || 0) + (d.active || 0);
      return { intake, burned };
    });
    const max = Math.max(1, ...values.map((v) => Math.max(v.intake, v.burned)));

    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });

    const labelEvery = Math.max(1, Math.ceil(days.length / 6));

    days.forEach((d, i) => {
      const x0 = i * slot;
      const barW = Math.max(3, slot / 2 - 4);
      const v = values[i];
      const hIntake = (v.intake / max) * chartH;
      const hBurned = (v.burned / max) * chartH;

      svg.appendChild(svgEl("rect", {
        x: x0 + slot / 2 - barW - 1,
        y: padTop + (chartH - hIntake),
        width: barW,
        height: hIntake,
        rx: 2,
        fill: "var(--intake)",
      }));
      svg.appendChild(svgEl("rect", {
        x: x0 + slot / 2 + 1,
        y: padTop + (chartH - hBurned),
        width: barW,
        height: hBurned,
        rx: 2,
        fill: "var(--burned)",
      }));

      if (i % labelEvery === 0 || i === days.length - 1) {
        const t = svgEl("text", {
          x: x0 + slot / 2,
          y: height - 8,
          "text-anchor": "middle",
          "font-size": "9",
          fill: "var(--text-dim)",
        });
        t.textContent = formatShort(keyToDate(d.key));
        svg.appendChild(t);
      }
    });

    container.appendChild(svg);
    container.scrollLeft = container.scrollWidth;
  }

  function renderLineChart(days) {
    const container = document.getElementById("weightChart");
    container.innerHTML = "";

    const points = days
      .map((d, i) => (d.weight !== undefined ? { i, w: d.weight, key: d.key } : null))
      .filter(Boolean);

    if (points.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-hint";
      p.style.marginTop = "8px";
      p.textContent = "Keine Gewichtsdaten in diesem Zeitraum.";
      container.appendChild(p);
      return;
    }

    const slot = days.length > 40 ? 18 : days.length > 15 ? 26 : 40;
    const width = Math.max(days.length * slot, 280);
    const height = 180;
    const padBottom = 26;
    const padTop = 14;
    const chartH = height - padBottom - padTop;

    const weights = points.map((p) => p.w);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min || 1;

    const xFor = (i) => i * slot + slot / 2;
    const yFor = (w) => padTop + chartH - ((w - min) / range) * chartH;

    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height });

    const path = points.map((p, idx) => `${idx === 0 ? "M" : "L"}${xFor(p.i)},${yFor(p.w)}`).join(" ");
    svg.appendChild(svgEl("path", {
      d: path,
      fill: "none",
      stroke: "var(--accent-dim)",
      "stroke-width": 2.5,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    }));

    points.forEach((p) => {
      svg.appendChild(svgEl("circle", {
        cx: xFor(p.i), cy: yFor(p.w), r: 3, fill: "var(--accent-dim)",
      }));
    });

    const labelEvery = Math.max(1, Math.ceil(days.length / 6));
    days.forEach((d, i) => {
      if (i % labelEvery === 0 || i === days.length - 1) {
        const t = svgEl("text", {
          x: xFor(i), y: height - 8, "text-anchor": "middle",
          "font-size": "9", fill: "var(--text-dim)",
        });
        t.textContent = formatShort(keyToDate(d.key));
        svg.appendChild(t);
      }
    });

    container.appendChild(svg);
    container.scrollLeft = container.scrollWidth;
  }

  function renderCharts() {
    const days = getRangeDays();
    const emptyEl = document.getElementById("chartEmpty");
    const hasAny = sortedKeys().length > 0;
    emptyEl.hidden = hasAny;
    renderBarChart(days);
    renderLineChart(days);
  }

  document.getElementById("rangeSwitch").addEventListener("click", (e) => {
    const btn = e.target.closest(".range-btn");
    if (!btn) return;
    currentRange = btn.dataset.range;
    document.querySelectorAll(".range-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderCharts();
  });

  /* ---------- tab switching ---------- */

  function switchView(viewId) {
    currentView = viewId;
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === viewId));
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));
    if (viewId === "view-list") renderList();
    if (viewId === "view-chart") renderCharts();
    if (viewId === "view-entry") renderEntry();
    document.getElementById("main").scrollTop = 0;
  }

  document.getElementById("tabbar").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    switchView(btn.dataset.view);
  });

  /* ---------- init ---------- */

  renderEntry();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed", e));
    });
  }
})();
