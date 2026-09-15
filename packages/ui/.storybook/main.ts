import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
};

export default config;
