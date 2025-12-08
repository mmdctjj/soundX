import { useEffect, useState } from "react";

export const useTheme = () => {

  const themeMedia = window.matchMedia("(prefers-color-scheme: light)");

  const [value, setValue] = useState<'light' | 'dark'>(themeMedia.matches ? 'light' : 'dark');

  useEffect(() => {

    themeMedia.addEventListener('change', e =>
      setValue(e.matches ? 'light' : 'dark')
    );

    return () => themeMedia.removeEventListener("change", e =>
      setValue(e.matches ? 'light' : 'dark')
    );
  }, []);

  return value;
};
