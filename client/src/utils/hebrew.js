export function cleanHebrew(s) {
  return String(s || '')
    .replace(/[֑-ׇ]/g, '')
    .replace(/['"׳״]/g, '')
    .trim();
}

// Mirrors the server rule: a leading definite-article ה is allowed before the round letter.
export function startsWithLetter(text, letter) {
  const t = cleanHebrew(text);
  return t[0] === letter || (t[0] === 'ה' && t[1] === letter);
}
