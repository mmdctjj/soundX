export interface LyricLine { time: number; text: string }

export function parseLRC(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(re);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const ms = Number(m[3].padEnd(3, '0').slice(0, 3));
    const total = min * 60_000 + sec * 1000 + ms;
    const text = m[4].trim();
    lines.push({ time: total, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function findActiveLine(lines: LyricLine[], currentMs: number): number {
  if (lines.length === 0) return -1;
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentMs) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans;
}