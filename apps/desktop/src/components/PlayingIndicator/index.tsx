import { theme } from "antd";
import React from "react";
import styles from "./index.module.less";

const PlayingIndicator: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <div
      className={styles.container}
      style={
        {
          "--primary-color": token.colorText,
        } as React.CSSProperties
      }
    >
      <div className={styles.bar} />
      <div className={styles.bar} />
      <div className={styles.bar} />
    </div>
  );
};

export default PlayingIndicator;
