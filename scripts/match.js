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

// ---- Helpers ----
function parseAnswerItem(item, colIdx, rowIdx) {
    let answer, aliases = [];
    if (typeof item === 'string') {
        answer = item;
    } else if (item && typeof item === 'object' && item.answer) {
        answer = item.answer;
        if (Array.isArray(item.aliases)) aliases = item.aliases;
    } else {
        console.warn('parseAnswerItem: invalid item at', colIdx, rowIdx, item);
        return null;
    }
    const key = matchKey(answer);
    // Generate a unique ID: use the normalized key plus column/row to avoid collisions
    const id = `col-${String(colIdx)}-row-${String(rowIdx)}`;
    // Fallback: if the ID somehow becomes empty, use the key
    const finalId = id || key;
    return { id: finalId, answer, key, aliases };
}

// ---- Reset ----
function resetMatchState(quiz) {
    console.log('resetMatchState called with quiz:', quiz.id);
    answerMap = new Map();
    aliasMap = new Map();

    let totalProcessed = 0;

    for (let colIdx = 0; colIdx < quiz.columns.length; colIdx++) {
        const col = quiz.columns[colIdx];
        console.log(`  Column ${colIdx} "${col.title}" has ${col.answers.length} answers`);
        for (let rowIdx = 0; rowIdx < col.answers.length; rowIdx++) {
            const raw = col.answers[rowIdx];
            totalProcessed++;
            const parsed = parseAnswerItem(raw, colIdx, rowIdx);
            if (!parsed) {
                console.warn(`  Skipped item at col ${colIdx}, row ${rowIdx}:`, raw);
                continue;
            }
            const { id, answer, key, aliases } = parsed;
            // Ensure id is a string
            if (!id) {
                console.warn('  ID is empty for', answer, '– skipping');
                continue;
            }
            // Store answer info
            answerMap.set(id, { original: answer, columnIndex: colIdx, rowIndex: rowIdx });
            // Map canonical key to id
            if (key) {
                aliasMap.set(key, id);
            }
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

    console.log(`resetMatchState: processed ${totalProcessed} items, accepted ${totalAnswers} answers`);
    console.log('  answerMap keys:', [...answerMap.keys()].slice(0, 5), '...');
    console.log('  aliasMap keys:', [...aliasMap.keys()].slice(0, 5), '...');
}

function isQuizComplete() {
    return found.size === totalAnswers && totalAnswers > 0;
}

// ---- Match ----
function tryMatch(raw) {
    if (!raw || !raw.trim()) return false;
    const key = matchKey(raw);
    console.log('tryMatch:', raw, '→ key:', key);
    if (!aliasMap.has(key)) {
        console.log('  Key not found in aliasMap');
        return false;
    }
    const id = aliasMap.get(key);
    console.log('  Matched id:', id);
    if (found.has(id)) {
        console.log('  Already found');
        return false;
    }
    if (!remaining.has(id)) {
        console.log('  Not in remaining');
        return false;
    }
    found.add(id);
    remaining.delete(id);
    lastMatchedId = id;
    console.log('  ✅ Match successful!');
    return true;
}

function clearLastMatched() {
    lastMatchedId = null;
}

// ---- Give up ----
function setGivenUp(val) { givenUp = val; }
function isGivenUp() { return givenUp; }

// ---- Expose ----
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