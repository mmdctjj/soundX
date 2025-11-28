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
  const [activeindex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Parse lyrics
  useEffect(() => {
    if (!lyrics) {
      setParsedLyrics([]);
      return;
    }

    const lines = lyrics.split("\n");
    const parsed: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    lines.forEach((line) => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = parseInt(match[3], 10);
        const time = minutes * 60 + seconds + milliseconds / 1000;
        const text = line.replace(timeRegex, "").trim();
        if (text) {
          parsed.push({ time, text });
        }
      }
    });

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
      activeindex >= 0 &&
      lineRefs.current[activeindex] &&
      containerRef.current
    ) {
      const container = containerRef.current;
      const line = lineRefs.current[activeindex];
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
  }, [activeindex]);

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
              index === activeindex ? styles.activeLyric : ""
            }`}
            style={{
              color:
                index === activeindex
                  ? token.colorPrimary
                  : token.colorTextSecondary,
              fontSize: index === activeindex ? "18px" : "16px",
              fontWeight: index === activeindex ? "bold" : "normal",
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
