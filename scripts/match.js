// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  match.js – Fuzzy matching, answer tracking, alias support
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function matchKey(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[\(\[].*?[\)\]]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .trim();
}

// ---- State ----
let answerMap = new Map();
let aliasMap = new Map();
let remaining = new Set();
let found = new Set();
let totalAnswers = 0;
let lastMatchedId = null;
let givenUp = false;

// ---- Reset ----
function resetMatchState(quiz) {
    console.log('resetMatchState called with quiz:', quiz.id);
    answerMap = new Map();
    aliasMap = new Map();

    for (let colIdx = 0; colIdx < quiz.columns.length; colIdx++) {
        const col = quiz.columns[colIdx];
        for (let rowIdx = 0; rowIdx < col.answers.length; rowIdx++) {
            const raw = col.answers[rowIdx];
            let answer = null;
            let aliases = [];

            // Extract answer and aliases
            if (typeof raw === 'string') {
                answer = raw;
            } else if (raw && typeof raw === 'object') {
                answer = raw.answer || raw.name || raw.text || raw.value;
                if (Array.isArray(raw.aliases)) aliases = raw.aliases;
                if (!answer) {
                    console.warn('No answer property found for:', raw);
                    continue;
                }
            } else {
                continue;
            }

            // ★ Use the SAME ID format as main.js ★
            const id = `col-${colIdx}-row-${rowIdx}`;
            const key = matchKey(answer);

            // Store answer info
            answerMap.set(id, { original: answer, columnIndex: colIdx, rowIndex: rowIdx });

            // Map canonical key
            if (key) aliasMap.set(key, id);

            // Map aliases
            for (const alias of aliases) {
                const aliasKey = matchKey(alias);
                if (aliasKey && !aliasMap.has(aliasKey)) {
                    aliasMap.set(aliasKey, id);
                }
            }
        }
    }

    remaining = new Set(answerMap.keys());
    found = new Set();
    totalAnswers = answerMap.size;
    lastMatchedId = null;
    givenUp = false;

    console.log(`resetMatchState: accepted ${totalAnswers} answers`);
    console.log('  sample keys:', [...aliasMap.keys()].slice(0, 10));
}

function isQuizComplete() {
    return found.size === totalAnswers && totalAnswers > 0;
}

function tryMatch(raw) {
    if (!raw || !raw.trim()) return false;
    const key = matchKey(raw);
    if (!aliasMap.has(key)) return false;
    const id = aliasMap.get(key);
    if (found.has(id) || !remaining.has(id)) return false;
    found.add(id);
    remaining.delete(id);
    lastMatchedId = id;
    return true;
}

function clearLastMatched() { lastMatchedId = null; }
function setGivenUp(val) { givenUp = val; }
function isGivenUp() { return givenUp; }

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
        aliasMap,
        remaining,
        found,
        totalAnswers,
        lastMatchedId
    })
};