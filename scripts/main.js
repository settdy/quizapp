// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  main.js – Load quizzes, render grid, handle selection & give-up
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const $ = (id) => document.getElementById(id);

let quizzes = [];
let currentQuiz = null;

// ---- Catppuccin color mapping ----
const CATPPUCCIN_COLORS = {
  rosewater: "#f5e0dc",
  flamingo: "#f2cdcd",
  pink: "#f5c2e7",
  mauve: "#cba6f7",
  red: "#f38ba8",
  maroon: "#eba0ac",
  peach: "#fab387",
  yellow: "#f9e2af",
  green: "#a6e3a1",
  teal: "#94e2d5",
  sky: "#89dceb",
  sapphire: "#74c7ec",
  blue: "#89b4fa",
  lavender: "#b4befe",
  surface0: "#313244",
  surface1: "#45475a",
  surface2: "#585b70",
  overlay0: "#6c7086",
  overlay1: "#7f849c",
  overlay2: "#9399b2",
  subtext0: "#a6adc8",
  subtext1: "#bac2de",
  text: "#cdd6f4",
  base: "#1e1e2e",
  mantle: "#181825",
  crust: "#11111b",
};

function getCatppuccinColor(name) {
  if (!name || name === "default" || name === "def") return null;
  return CATPPUCCIN_COLORS[name.toLowerCase()] || null;
}

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Parse answer item (for rendering, not matching) ----
function parseAnswerItem(raw, columnColor) {
  if (typeof raw === "string") {
    return { answer: raw, aliases: [], color: columnColor || "default" };
  }
  if (raw && typeof raw === "object") {
    const color =
      raw.color === "default" || raw.color === "def"
        ? columnColor || "default"
        : raw.color || "default";
    return {
      answer: raw.answer || "",
      aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
      color: color,
    };
  }
  return null;
}

// ---- Get current quiz ----
function getCurrentQuiz() {
  return currentQuiz;
}
window.main = { getCurrentQuiz };

// ---- Reset quiz state ----
function resetQuizState() {
  if (!currentQuiz) {
    console.warn("resetQuizState: no currentQuiz");
    return;
  }
  console.log(
    "resetQuizState: calling match.resetMatchState with quiz:",
    currentQuiz.id,
  );
  window.match.resetMatchState(currentQuiz);
  window.match.setGivenUp(false);
  renderGrid();
  $("i").value = "";
  $("i").disabled = false;
  $("i").focus();
}
window.main.resetQuizState = resetQuizState;

// ---- Render grid ----
function renderGrid() {
  const wrap = $("cols");
  if (!currentQuiz || !currentQuiz.columns || !currentQuiz.columns.length) {
    wrap.innerHTML = `<div class="empty-state">No columns.</div>`;
    return;
  }

  const state = window.match.getState();
  console.log(
    "renderGrid: state.found size =",
    state.found.size,
    "total =",
    state.totalAnswers,
  );
  const { answerMap, found, lastMatchedId } = state;
  const isGivenUp = window.match.isGivenUp();

  // Build column data with parsed items and column color
  const parsedColumns = currentQuiz.columns.map((col) => {
    const columnColor = col.color || null;
    return {
      title: col.title,
      color: columnColor,
      items: col.answers.map((raw) => parseAnswerItem(raw, columnColor)),
    };
  });

  const maxRows = Math.max(...parsedColumns.map((c) => c.items.length));
  const colCount = parsedColumns.length;
  wrap.style.setProperty("--cols", colCount);

  let html = '<div class="quiz-table">';

  // Header
  html += '<div class="table-row">';
  for (const col of parsedColumns) {
    html += `<div class="table-cell header-cell">${escHtml(col.title)}</div>`;
  }
  html += "</div>";

  // Data rows
  for (let row = 0; row < maxRows; row++) {
    html += '<div class="table-row">';
    for (let col = 0; col < colCount; col++) {
      const items = parsedColumns[col].items;
      if (row < items.length) {
        const item = items[row];
        const id = `col-${col}-row-${row}`;
        const matched = found.has(id);
        const color = matched || isGivenUp ? item.color : "default";
        const bgColor = getCatppuccinColor(color);

        let classes = "table-cell";
        if (matched) {
          classes += " matched";
          if (id === lastMatchedId) {
            classes += " just-matched";
          }
        } else if (isGivenUp) {
          classes += " missed";
        } else {
          classes += " hidden";
        }

        let style = "";
        if (bgColor) {
          style = ` style="background-color: ${bgColor};"`;
        }

        html += `<div class="${classes}" data-id="${id}"${style}>`;
        if (matched || isGivenUp) {
          html += `<span class="answer-text">${escHtml(item.answer)}</span>`;
        } else {
          html += `<span class="placeholder">▢</span>`;
        }
        html += "</div>";
      } else {
        html += '<div class="table-cell empty"></div>';
      }
    }
    html += "</div>";
  }

  html += "</div>";
  wrap.innerHTML = html;

  // Remove 'just-matched' after animation
  if (lastMatchedId) {
    setTimeout(() => {
      const animated = wrap.querySelectorAll(".just-matched");
      animated.forEach((el) => el.classList.remove("just-matched"));
      window.match.clearLastMatched();
    }, 350);
  }

  if (window.counter) {
    window.counter.updateCounter();
  }
}

// ---- Load quiz ----
function loadQuiz(quizId) {
  console.log("loadQuiz called with quizId:", quizId);
  currentQuiz = quizzes.find((q) => q.id === quizId) || quizzes[0] || null;
  if (!currentQuiz) {
    console.warn("loadQuiz: no quiz found");
    $("cols").innerHTML =
      `<div class="empty-state">No quizzes available.</div>`;
    $("p").textContent = "0 / 0";
    $("progressBar").style.width = "0%";
    return;
  }
  console.log(
    "loadQuiz: currentQuiz has",
    currentQuiz.columns.length,
    "columns",
  );
  // Reset match state
  console.log("loadQuiz: calling match.resetMatchState");
  window.match.resetMatchState(currentQuiz);
  window.match.setGivenUp(false);
  if (window.timer) window.timer.resetTimer();
  $("i").disabled = true;
  $("i").value = "";
  renderGrid();
}

// ---- Input handler ----
function handleInput() {
  if (!$("i") || $("i").isComposing) return;
  const raw = $("i").value;
  if (!raw.trim()) return;
  if (!window.timer || !window.timer.isQuizStarted()) return;

  const matched = window.match.tryMatch(raw);
  if (matched) {
    $("i").value = "";
    renderGrid();
  }
}

// ---- Give Up handler ----
function handleGiveUp() {
  if (!currentQuiz) return;
  if (window.timer) {
    window.timer.stopTimer();
  }
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = false;
  startBtn.textContent = "▶ Start Quiz";
  $("i").disabled = true;
  $("i").value = "";
  document.getElementById("giveUpBtn").disabled = true;
  window.match.setGivenUp(true);
  renderGrid();
}

// ---- Init ----
async function init() {
  try {
    const manifestRes = await fetch("./quizzes/manifest.json");
    if (!manifestRes.ok) throw new Error("manifest.json not found");
    const manifest = await manifestRes.json();
    const files = manifest.files || [];

    const loaded = [];
    for (const f of files) {
      try {
        const res = await fetch("./quizzes/" + f);
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data)) loaded.push(...data);
        else loaded.push(data);
      } catch (err) {
        console.error(`Failed to load ${f}:`, err);
      }
    }

    console.log("Loaded raw data:", loaded);

    quizzes = loaded
      .filter((q) => q && q.id && Array.isArray(q.columns))
      .map((q) => {
        console.log("Quiz:", q.id, "has", q.columns.length, "columns");
        q.columns.forEach((c, i) => {
          console.log(
            `  Column ${i} "${c.title}" has ${c.answers.length} answers`,
          );
        });
        return {
          id: String(q.id),
          title: String(q.title || q.id),
          columns: q.columns.map((c) => ({
            title: String(c.title || ""),
            color: c.color || null,
            answers: c.answers || [],
          })),
        };
      });

    console.log("Processed quizzes:", quizzes);

    const sel = $("q");
    sel.innerHTML = quizzes
      .map(
        (q) => `<option value="${escHtml(q.id)}">${escHtml(q.title)}</option>`,
      )
      .join("");

    if (quizzes.length === 0) {
      $("cols").innerHTML = `<div class="empty-state">No quizzes found.</div>`;
      $("p").textContent = "0 / 0";
      return;
    }

    loadQuiz(quizzes[0].id);
    sel.addEventListener("change", () => loadQuiz(sel.value));

    document
      .getElementById("giveUpBtn")
      .addEventListener("click", handleGiveUp);

    $("i").addEventListener("input", handleInput);
    $("i").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleInput();
      }
    });
  } catch (err) {
    console.error("Init error:", err);
    $("cols").innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
    $("p").textContent = "0 / 0";
  }
}

window.main = { ...window.main, getCurrentQuiz: () => currentQuiz };
init();
