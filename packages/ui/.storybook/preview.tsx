import type { Preview } from "@storybook/nextjs-vite";
import { useEffect, type ReactNode } from "react";
import { ThemeProvider } from "../src/theme-provider";
import "../src/styles.css";

interface StoryEnvironmentProps {
  children: ReactNode;
  motion: "full" | "reduced";
  textScale: "default" | "expanded";
  theme: "system" | "light" | "dark";
}

function StoryEnvironment({
  children,
  motion,
  textScale,
  theme,
}: StoryEnvironmentProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = motion;
    root.style.fontSize = textScale === "expanded" ? "200%" : "";

    return () => {
      delete root.dataset.motion;
      root.style.fontSize = "";
    };
  }, [motion, textScale]);

  return (
    <ThemeProvider forcedTheme={theme === "system" ? undefined : theme}>
      {children}
    </ThemeProvider>
  );
}

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <StoryEnvironment
        motion={context.globals.motion}
        textScale={context.globals.textScale}
        theme={context.globals.theme}
      >
        <Story />
      </StoryEnvironment>
    ),
  ],
  globalTypes: {
    motion: {
      description: "Motion preference",
      toolbar: {
        dynamicTitle: true,
        icon: "accessibility",
        items: ["full", "reduced"],
        title: "Motion",
      },
    },
    textScale: {
      description: "Text scale",
      toolbar: {
        dynamicTitle: true,
        icon: "paragraph",
        items: ["default", "expanded"],
        title: "Text",
      },
    },
    theme: {
      description: "Color theme",
      toolbar: {
        dynamicTitle: true,
        icon: "contrast",
        items: ["system", "light", "dark"],
        title: "Theme",
      },
    },
  },
  initialGlobals: {
    motion: "full",
    textScale: "default",
    theme: "system",
  },
  parameters: {
    a11y: { test: "error" },
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
};

export default preview;
