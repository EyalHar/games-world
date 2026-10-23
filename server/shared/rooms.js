function createCode(rooms) {
  let code;
  do code = String(1000 + Math.floor(Math.random() * 9000));
  while (rooms.has(code));
  return code;
}

function passesThreshold(yes, total, threshold) {
  if (threshold === 'unanimous') return yes === total;
  if (threshold === 'p65') return yes / total >= 0.65;
  return yes > total / 2;
}

function cleanName(name, maxLength = 16) {
  return String(name || '').trim().slice(0, maxLength) || null;
}

module.exports = { createCode, passesThreshold, cleanName };
