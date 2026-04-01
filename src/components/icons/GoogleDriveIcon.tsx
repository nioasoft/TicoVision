/**
 * Google Drive logo icon as SVG component
 */

interface GoogleDriveIconProps {
  className?: string;
}

export function GoogleDriveIcon({ className = 'h-4 w-4' }: GoogleDriveIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 87.3 78"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z"
        fill="#0066DA"
      />
      <path
        d="M43.65 25.15L29.9 1.35c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.2c-.8 1.4-1.2 2.95-1.2 4.5h27.5l16.15-27.55z"
        fill="#00AC47"
      />
      <path
        d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85L53.3 65.55l-6.55 11.25 13.75.05c1.6 0 3.15-.4 4.55-1.2l8.5-4.85v6z"
        fill="#EA4335"
      />
      <path
        d="M43.65 25.15L57.4 1.35C56.05.55 54.5.15 52.9.15H34.4c-1.6 0-3.15.45-4.5 1.2l13.75 23.8z"
        fill="#00832D"
      />
      <path
        d="M59.85 53H27.5L13.75 76.8c1.4.8 2.95 1.2 4.55 1.2h45.6c1.6 0 3.15-.4 4.55-1.2L59.85 53z"
        fill="#2684FC"
      />
      <path
        d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25.15 59.85 53h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z"
        fill="#FFBA00"
      />
    </svg>
  );
}
