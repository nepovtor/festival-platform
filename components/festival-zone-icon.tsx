type FestivalZoneIconName =
  | "activity"
  | "workshop"
  | "photo"
  | "food"
  | "market"
  | "kids";

type FestivalZoneIconProps = {
  name: FestivalZoneIconName;
};

export function FestivalZoneIcon({ name }: FestivalZoneIconProps) {
  const common = {
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 32 32",
  };

  if (name === "activity") {
    return (
      <svg {...common}>
        <path d="M5 10.5h22v5a3 3 0 0 0 0 6v5H5v-5a3 3 0 0 0 0-6Z" />
        <path d="M13 11v15M19 11v15" strokeDasharray="2.2 2.2" />
      </svg>
    );
  }

  if (name === "workshop") {
    return (
      <svg {...common}>
        <path d="m8 24 10-10 4 4-10 10H8Z" />
        <path d="m18 14 2-6 4-4 4 4-4 4Z" />
        <path d="M6 8h7M9.5 4.5v7" />
      </svg>
    );
  }

  if (name === "photo") {
    return (
      <svg {...common}>
        <path d="M5 10h6l2-3h6l2 3h6v16H5Z" />
        <circle cx="16" cy="18" r="5" />
        <path d="M23 13h1" />
      </svg>
    );
  }

  if (name === "food") {
    return (
      <svg {...common}>
        <path d="M9 4v9M6 4v6c0 2 1 3 3 3s3-1 3-3V4M9 13v15" />
        <path d="M20 4c4 4 5 8 5 12h-5v12M20 4v24" />
      </svg>
    );
  }

  if (name === "market") {
    return (
      <svg {...common}>
        <path d="m7 25 12-12 5 5-12 12H7Z" />
        <path d="m18 12 4-7 5 5-7 4" />
        <path d="M6 8c3 0 5-2 5-5M5 14c4 0 7 2 8 6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M8 21h16l-2 6H10Z" />
      <path d="M11 21v-7h10v7M14 14V9h4v5" />
      <circle cx="10" cy="8" r="3" />
      <circle cx="23" cy="10" r="2.5" />
    </svg>
  );
}

export const festivalZoneIconNames: FestivalZoneIconName[] = [
  "activity",
  "workshop",
  "photo",
  "food",
  "market",
  "kids",
];
