import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, defineProject } from "vitest/config";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          environment: "jsdom",
          exclude: ["tests/**/*.visual.test.tsx"],
          include: ["tests/**/*.test.{mjs,ts,tsx}"],
          name: "unit",
        },
      }),
      defineProject({
        optimizeDeps: {
          include: [
            "@base-ui/react/avatar",
            "@base-ui/react/progress",
            "@base-ui/react/tabs",
          ],
        },
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [
              {
                browser: "chromium",
                viewport: { height: 720, width: 1280 },
              },
            ],
            provider: playwright({}),
          },
          include: ["tests/**/*.visual.test.tsx"],
          name: "visual",
        },
      }),
      defineProject({
        optimizeDeps: {
          include: [
            "@base-ui/react/avatar",
            "@base-ui/react/progress",
            "@base-ui/react/tabs",
          ],
        },
        plugins: [
          storybookTest({
            configDir: path.join(directory, ".storybook"),
          }),
        ],
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
            provider: playwright({}),
          },
          name: "storybook",
        },
      }),
    ],
  },
});
