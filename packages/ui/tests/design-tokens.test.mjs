// @vitest-environment node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "vitest";

const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

function resolveVariable(name, declarations) {
  const value = declarations.get(name);
  assert.ok(value, `Missing CSS variable ${name}`);

  const reference = value.match(/^var\((--[^)]+)\)$/)?.[1];
  return reference ? resolveVariable(reference, declarations) : value;
}

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (left, right) => right - left,
  );

  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test("light theme accent supports normal-size contrast text", () => {
  const lightTheme = styles.slice(0, styles.indexOf("@media"));
  const declarations = new Map(
    [...lightTheme.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
  const accent = resolveVariable("--semantic-accent", declarations);
  const foreground = resolveVariable("--semantic-accent-contrast", declarations);

  assert.ok(
    contrastRatio(foreground, accent) >= 4.5,
    `${foreground} on ${accent} must meet WCAG AA contrast for normal text`,
  );
});
