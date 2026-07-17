function matchKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\(\[].*?[\)\]]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

let answerMap = new Map();
let keyToIds = new Map();
let remaining = new Set();
let found = new Set();
let totalAnswers = 0;
let lastMatchedIds = new Set();
let givenUp = false;

function resetMatchState(quiz) {
  answerMap = new Map();
  keyToIds = new Map();

  for (let colIdx = 0; colIdx < quiz.columns.length; colIdx++) {
    const col = quiz.columns[colIdx];
    for (let rowIdx = 0; rowIdx < col.answers.length; rowIdx++) {
      const raw = col.answers[rowIdx];
      let answer = null;
      let aliases = [];
      if (typeof raw === "string") {
        answer = raw;
      } else if (raw && typeof raw === "object") {
        answer = raw.answer || raw.name || raw.text || raw.value;
        if (Array.isArray(raw.aliases)) aliases = raw.aliases;
        if (!answer) continue;
      } else continue;
      const id = `col-${colIdx}-row-${rowIdx}`;
      const key = matchKey(answer);
      answerMap.set(id, {
        original: answer,
        columnIndex: colIdx,
        rowIndex: rowIdx,
      });
      if (!keyToIds.has(key)) keyToIds.set(key, new Set());
      keyToIds.get(key).add(id);
      for (const alias of aliases) {
        const aliasKey = matchKey(alias);
        if (aliasKey) {
          if (!keyToIds.has(aliasKey)) keyToIds.set(aliasKey, new Set());
          keyToIds.get(aliasKey).add(id);
        }
      }
    }
  }

  remaining = new Set(answerMap.keys());
  found = new Set();
  totalAnswers = answerMap.size;
  lastMatchedIds = new Set();
  givenUp = false;
}

function isQuizComplete() {
  return found.size === totalAnswers && totalAnswers > 0;
}

function tryMatch(raw) {
  if (!raw || !raw.trim()) return 0;
  const key = matchKey(raw);
  if (!keyToIds.has(key)) return 0;

  const ids = keyToIds.get(key);
  const matchedIds = [];
  for (const id of ids) {
    if (remaining.has(id)) {
      matchedIds.push(id);
    }
  }
  if (matchedIds.length === 0) return 0;

  for (const id of matchedIds) {
    found.add(id);
    remaining.delete(id);
  }
  lastMatchedIds = new Set(matchedIds);
  return matchedIds.length;
}

function clearLastMatched() {
  lastMatchedIds = new Set();
}

function setGivenUp(val) {
  givenUp = val;
}
function isGivenUp() {
  return givenUp;
}

window.match = {
  matchKey,
  resetMatchState,
  isQuizComplete,
  tryMatch,
  clearLastMatched,
  setGivenUp,
  isGivenUp,
  getState: () => ({
    answerMap,
    keyToIds,
    remaining,
    found,
    totalAnswers,
    lastMatchedIds,
  }),
};
