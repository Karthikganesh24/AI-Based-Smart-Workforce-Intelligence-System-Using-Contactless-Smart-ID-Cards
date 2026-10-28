export const ThermometerIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path d="M8 2V10" strokeLinecap="round" />
    <circle cx="8" cy="12" r="2.5" />
    <path d="M5.5 9V4C5.5 2.6 6.6 1.5 8 1.5C9.4 1.5 10.5 2.6 10.5 4V9" strokeLinecap="round" />
  </svg>
);

export const FanIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
    <circle cx="8" cy="8" r="1.5" />
    <path d="M8 6.5C8 4 6.5 2 4.5 2C6 3.5 6.5 5 8 6.5Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 8C12 8 14 6.5 14 4.5C12.5 6 11 6.5 9.5 8Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 9.5C8 12 9.5 14 11.5 14C10 12.5 9.5 11 8 9.5Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 8C4 8 2 9.5 2 11.5C3.5 10 5 9.5 6.5 8Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LightbulbIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path d="M6 12H10M6.5 14H9.5" strokeLinecap="round" />
    <path d="M6 10C4.5 9 3.5 7.5 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 7.5 11.5 9 10 10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SnowflakeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path d="M8 1V15M1 8H15M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" strokeLinecap="round" />
    <path d="M6 2.5L8 1L10 2.5M6 13.5L8 15L10 13.5M2.5 6L1 8L2.5 10M13.5 6L15 8L13.5 10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LeafIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path d="M3 14C3 14 3 8 8 4C13 0 14 2 14 2C14 2 15 3 11 8C7 13 3 14 3 14Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 14C5 12 7 9 10 6" strokeLinecap="round" />
  </svg>
);
