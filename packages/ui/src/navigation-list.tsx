export interface NavigationItem {
  href: string;
  label: string;
}

const linkStyles = {
  desktop:
    "flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  mobile:
    "flex min-h-12 items-center rounded-control px-3 text-base font-semibold text-muted outline-none transition-colors hover:bg-surface-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
} as const;

export function NavigationList({
  items,
  variant,
}: {
  items: NavigationItem[];
  variant: keyof typeof linkStyles;
}) {
  return (
    <ul
      className={
        variant === "mobile" ? "flex flex-col gap-2" : "flex flex-col gap-1"
      }
      role="list"
    >
      {items.map((item, index) => (
        <li key={item.href}>
          <a
            className={linkStyles[variant]}
            data-active={index === 0 || undefined}
            href={item.href}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
