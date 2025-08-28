
export type IconName = "select" | "point" | "line" | "polygon" | "refresh" | "clear";

export default function Icon({
  name,
  size = 16,
  stroke = 1.8,
  className = "",
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    focusable: false,
  };

  switch (name) {
    case "select":
      return (
        <svg {...common}>
          <path d="M4 3 L14 13 L10 13 L11 20 L8.5 20 L7.5 13 L4 13 Z" fill="currentColor" />
        </svg>
      );
    case "point":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "line":
      return (
        <svg {...common}>
          <line x1="5" y1="19" x2="19" y2="5" />
          <circle cx="5" cy="19" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="19" cy="5" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "polygon":
      return (
        <svg {...common}>
          <polygon points="6,18 10,5 19,9 15,19" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-3.2-6.4" />
          <path d="M20 5v5h-5" />
        </svg>
      );
    case "clear":
      return (
        <svg {...common}>
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </svg>
      );
    default:
      return null;
  }
}
