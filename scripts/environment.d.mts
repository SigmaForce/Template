import type { FoundationEnvironment } from "./environment-core.mjs";

export * from "./environment-core.mjs";

export function loadEnvironment(environmentFile: string): FoundationEnvironment;
