// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  counter.js – Update progress counter and progress bar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const progressText = document.getElementById("p");
const progressBar = document.getElementById("progressBar");
const feedback = document.getElementById("feedback");

function updateCounter() {
  const state = window.match.getState();
  const done = state.found.size;
  const total = state.totalAnswers;
  progressText.innerHTML = `<strong>${done}</strong> / ${total}`;
  const pct = total > 0 ? (done / total) * 100 : 0;
  progressBar.style.width = Math.min(pct, 100) + "%";

  if (done === total && total > 0) {
    feedback.textContent = `🎉 Done! ${total}/${total}`;
    feedback.className = "done";
    if (window.timer) {
      window.timer.finishTimer();
    }
    document.getElementById("i").disabled = true;
  } else {
    feedback.textContent = "";
  }
}

// Expose for other modules to call
window.counter = { updateCounter };
