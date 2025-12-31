import Pinyin from "tiny-pinyin";

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
        // Use Pinyin for any non-English character
        const pinyin = Pinyin.convertToPinyin(firstChar);
        if (pinyin && pinyin.length > 0 && /[A-Z]/.test(pinyin[0].toUpperCase())) {
          initial = pinyin[0].toUpperCase();
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
