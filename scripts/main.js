const $ = (id) => document.getElementById(id);

let quizzes = [];
let currentQuiz = null;

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function parseAnswerItem(raw) {
  if (typeof raw === "string") {
    return { answer: raw, aliases: [] };
  }
  if (raw && typeof raw === "object") {
    return {
      answer: raw.answer || "",
      aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
    };
  }
  return null;
}

function getCurrentQuiz() {
  return currentQuiz;
}
window.main = { getCurrentQuiz };

function resetQuizState() {
  if (!currentQuiz) {
    console.warn("resetQuizState: no currentQuiz");
    return;
  }
  window.match.resetMatchState(currentQuiz);
  window.match.setGivenUp(false);
  renderGrid();
  $("i").value = "";
  $("i").disabled = false;
  $("i").focus();
}
window.main.resetQuizState = resetQuizState;

function renderGrid() {
  const wrap = $("cols");
  if (!currentQuiz || !currentQuiz.columns || !currentQuiz.columns.length) {
    wrap.innerHTML = `<div class="empty-state">No columns.</div>`;
    return;
  }

  const state = window.match.getState();
  const { found, lastMatchedIds } = state;
  const isGivenUp = window.match.isGivenUp();

  const parsedColumns = currentQuiz.columns.map((col) => ({
    title: col.title,
    items: col.answers.map((raw) => parseAnswerItem(raw)),
  }));

  const maxRows = Math.max(...parsedColumns.map((c) => c.items.length));
  const colCount = parsedColumns.length;
  wrap.style.setProperty("--cols", colCount);

  let html = '<div class="quiz-table">';
  html += '<div class="table-row">';
  for (let col = 0; col < colCount; col++) {
    const colData = parsedColumns[col];
    const items = colData.items;
    let foundInColumn = 0;
    for (let row = 0; row < items.length; row++) {
      const id = `col-${col}-row-${row}`;
      if (found.has(id)) foundInColumn++;
    }

    const totalInColumn = items.length;
    const displayTitle =
      totalInColumn > 0
        ? `${colData.title} (${foundInColumn}/${totalInColumn})`
        : colData.title;
    html += `<div class="table-cell header-cell">${escHtml(displayTitle)}</div>`;
  }
  html += "</div>";

  for (let row = 0; row < maxRows; row++) {
    html += '<div class="table-row">';
    for (let col = 0; col < colCount; col++) {
      const items = parsedColumns[col].items;
      if (row < items.length) {
        const item = items[row];
        const id = `col-${col}-row-${row}`;
        const matched = found.has(id);
        const isJustMatched = lastMatchedIds.has(id);

        let classes = "table-cell";
        if (matched) {
          classes += " matched";
          if (isJustMatched) {
            classes += " just-matched";
          }
        } else if (isGivenUp) {
          classes += " missed";
        } else {
          classes += " hidden";
        }

        html += `<div class="${classes}" data-id="${id}">`;
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

  if (lastMatchedIds.size > 0) {
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

function loadQuiz(quizId) {
  currentQuiz = quizzes.find((q) => q.id === quizId) || quizzes[0] || null;
  if (!currentQuiz) {
    $("cols").innerHTML =
      `<div class="empty-state">No quizzes available.</div>`;
    $("p").textContent = "0 / 0";
    $("progressBar").style.width = "0%";
    return;
  }
  window.match.resetMatchState(currentQuiz);
  window.match.setGivenUp(false);
  if (window.timer) window.timer.resetTimer();
  $("i").disabled = true;
  $("i").value = "";
  renderGrid();
}

function handleInput() {
  if (!$("i") || $("i").isComposing) return;
  const raw = $("i").value;
  if (!raw.trim()) return;
  if (!window.timer || !window.timer.isQuizStarted()) return;

  const matchCount = window.match.tryMatch(raw);
  if (matchCount > 0) {
    $("i").value = "";
    renderGrid();
  }
}

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
