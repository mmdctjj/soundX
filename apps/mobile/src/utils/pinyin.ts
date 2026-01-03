import { pinyin } from "pinyin-pro";

export interface SectionData<T> {
  title: string;
  data: T[];
}

export const groupAndSort = <T>(
  data: T[],
  keySelector: (item: T) => string
): SectionData<T>[] => {
  const groups: { [key: string]: T[] } = {};

  data.forEach((item) => {
    const name = keySelector(item);
    let initial = "#";
    if (name) {
      const firstChar = name[0];
      if (/[a-zA-Z]/.test(firstChar)) {
        initial = firstChar.toUpperCase();
      } else {
        // Use pinyin-pro for non-English characters
        try {
          const py = pinyin(firstChar, { pattern: 'first', toneType: 'none', type: 'array' });
          if (py && py.length > 0 && /[a-zA-Z]/.test(py[0])) {
            initial = py[0].toUpperCase();
          }
        } catch (e) {
          // Fallback to # if conversion fails
          console.warn("Pinyin conversion failed for:", firstChar);
        }
      }
    }

    if (!groups[initial]) {
      groups[initial] = [];
    }
    groups[initial].push(item);
  });

  const sections: SectionData<T>[] = Object.keys(groups)
    .sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    })
    .map((key) => ({
      title: key,
      data: groups[key],
    }));

  return sections;
};
