type FestivalFactIconProps = {
  name: "calendar" | "clock" | "pin";
};

export function FestivalFactIcon({ name }: FestivalFactIconProps) {
  if (name === "calendar") {
    return (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
        <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" />
        <path d="M8 14h3M13 14h3M8 17h3" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3.5 2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 21s6-5.8 6-12a6 6 0 1 0-12 0c0 6.2 6 12 6 12Z" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  );
}
