import { LinkButton } from "./button";

export default function AboutInfoButton() {
  return (
    <LinkButton
      href="/about"
      title="About PlayIRL.GG"
      aria-label="About PlayIRL.GG"
      variant="icon"
      className="ml-1"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </LinkButton>
  );
}
