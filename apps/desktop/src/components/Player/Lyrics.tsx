import { Typography, theme } from "antd";
import React, { useEffect, useRef, useState } from "react";
import styles from "./index.module.less";

const { Text } = Typography;

interface LyricsProps {
  lyrics: string | null;
  currentTime: number;
}

interface LyricLine {
  time: number;
  text: string;
}

const Lyrics: React.FC<LyricsProps> = ({ lyrics, currentTime }) => {
  const { token } = theme.useToken();
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Parse lyrics
  useEffect(() => {
    if (!lyrics) {
      setParsedLyrics([]);
      return;
    }

    const lines = lyrics.split(/\r?\n/);
    const parsed: LyricLine[] = [];
    // Regex to match all timestamps in a line: [mm:ss.xx] or [mm:ss.xxx]
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

    lines.forEach((line) => {
      const matches = [...line.matchAll(timeRegex)];
      if (matches.length > 0) {
        const text = line.replace(timeRegex, "").trim();
        if (text) {
          matches.forEach((match) => {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3], 10);
            const time = minutes * 60 + seconds + milliseconds / 1000;
            parsed.push({ time, text });
          });
        }
      }
    });

    // Sort by time
    parsed.sort((a, b) => a.time - b.time);

    setParsedLyrics(parsed);
  }, [lyrics]);

  // Find active line
  useEffect(() => {
    if (parsedLyrics.length === 0) {
      setActiveIndex(-1);
      return;
    }

    let index = parsedLyrics.findIndex((line) => line.time > currentTime) - 1;
    if (index === -2) {
      // currentTime is smaller than first line time
      index = -1;
    } else if (index === -1) {
      // currentTime is larger than last line time
      index = parsedLyrics.length - 1;
    }

    setActiveIndex(index);
  }, [currentTime, parsedLyrics]);

  // Auto scroll
  useEffect(() => {
    if (
      activeIndex >= 0 &&
      lineRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const container = containerRef.current;
      const line = lineRefs.current[activeIndex];
      if (line) {
        const containerHeight = container.clientHeight;
        const lineHeight = line.clientHeight;
        const offset = line.offsetTop - containerHeight / 2 + lineHeight / 2;
        container.scrollTo({
          top: offset,
          behavior: "smooth",
        });
      }
    }
  }, [activeIndex]);

  if (!lyrics || parsedLyrics.length === 0) {
    return (
      <div className={styles.noLyrics}>
        <Text type="secondary" style={{ fontSize: "16px" }}>
          暂无歌词
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.lyricsContainer} ref={containerRef}>
      <div className={styles.lyricsContent}>
        {parsedLyrics.map((line, index) => (
          <div
            key={index}
            ref={(el) => {
              lineRefs.current[index] = el;
            }}
            className={`${styles.lyricLine} ${
              index === activeIndex ? styles.activeLyric : ""
            }`}
            style={{
              color:
                index === activeIndex
                  ? token.colorPrimary
                  : token.colorTextSecondary,
              fontSize: index === activeIndex ? "18px" : "16px",
              fontWeight: index === activeIndex ? "bold" : "normal",
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lyrics;
