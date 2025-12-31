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
      } else if (/[\u4e00-\u9fa5]/.test(firstChar)) {
        const pinyin = Pinyin.convertToPinyin(firstChar); // returns 'ZHONG'
        if (pinyin && pinyin.length > 0) {
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
