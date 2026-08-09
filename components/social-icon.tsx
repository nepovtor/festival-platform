type SocialIconName = "instagram" | "tiktok" | "vk";

type SocialIconProps = {
  name: SocialIconName;
};

export function SocialIcon({ name }: SocialIconProps) {
  if (name === "instagram") {
    return (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "tiktok") {
    return (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M14.2 4.2v10.1a4.7 4.7 0 1 1-4.1-4.65" />
        <path d="M14.2 4.2c.7 2.4 2.2 3.9 4.8 4.35" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.3 7.2h3.2c.4 2.9 1.6 5.2 3.3 6.8V7.2h3.1v3.9c1.7-.2 2.9-1.5 3.5-3.9h3.1c-.5 2.6-1.7 4.4-3.4 5.4 1.7.8 3.1 2.3 4.2 4.5h-3.5c-.8-1.5-1.8-2.6-3.9-2.9v2.9h-.5c-5.8 0-8.8-3.5-9.1-9.9Z" />
    </svg>
  );
}
