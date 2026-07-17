// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  timer.js – Start/Stop/Reset timer, UI controls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let timerInterval = null;
let startTime = null;
let isTimerRunning = false;
let isQuizStarted = false;

const timerDisplay = document.getElementById("timerDisplay");
const startBtn = document.getElementById("startBtn");
const giveUpBtn = document.getElementById("giveUpBtn");
const inputField = document.getElementById("i");

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  if (startTime) {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = `⏱ ${formatTime(diff)}`;
  } else {
    timerDisplay.textContent = `⏱ 00:00`;
  }
}

function startTimer() {
  if (isTimerRunning) return;

  if (window.main && window.main.resetQuizState) {
    window.main.resetQuizState();
  }

  startTime = Date.now();
  isTimerRunning = true;
  isQuizStarted = true;
  inputField.disabled = false;
  inputField.focus();
  startBtn.textContent = "⏳ Running…";
  startBtn.disabled = true;
  giveUpBtn.disabled = false;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimerDisplay, 100);
}

function stopTimer() {
  if (!isTimerRunning) return;
  isTimerRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  if (startTime) {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = `⏱ ${formatTime(diff)}`;
    startTime = null;
  }
}

function finishTimer() {
  stopTimer();
  startBtn.textContent = "✓ Done";
  startBtn.disabled = true;
  isQuizStarted = false;
  inputField.disabled = true;
  giveUpBtn.disabled = true;
}

function resetTimer() {
  stopTimer();
  isTimerRunning = false;
  isQuizStarted = false;
  startTime = null;
  timerDisplay.textContent = `⏱ 00:00`;
  inputField.disabled = true;
  inputField.value = "";
  startBtn.textContent = "▶ Start Quiz";
  startBtn.disabled = false;
  giveUpBtn.disabled = true;
}

startBtn.addEventListener("click", () => {
  if (window.main && window.main.getCurrentQuiz) {
    const q = window.main.getCurrentQuiz();
    if (!q) {
      alert("Please select a quiz first.");
      return;
    }
  }
  startTimer();
});

window.timer = {
  startTimer,
  stopTimer,
  finishTimer,
  resetTimer,
  isQuizStarted: () => isQuizStarted,
};
