export function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) + input.charCodeAt(i);
    h = h & 0xFFFFFFFF;
  }
  // Convert to unsigned 32-bit hex
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function urlToFilename(url: string, ext: string): string {
  return `${djb2(url)}.${ext.replace(/^\./, '')}`;
}
