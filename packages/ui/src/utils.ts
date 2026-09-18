import { cx } from "class-variance-authority";

export function cn(...classes: Parameters<typeof cx>) {
  return cx(...classes);
}
