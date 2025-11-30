export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "00:00";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mStr = m.toString().padStart(2, "0");
  const sStr = s.toString().padStart(2, "0");

  if (h > 0) {
    const hStr = h.toString().padStart(2, "0");
    return `${hStr}:${mStr}:${sStr}`;
  }

  return `${mStr}:${sStr}`;
};
