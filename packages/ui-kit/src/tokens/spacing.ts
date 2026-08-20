export const spacing = {
  baseGrid: 8,
  scale: [4, 8, 12, 16, 24, 32, 48, 64] as const,
  contentMaxWidth: '720px',
  breakpoints: {
    mobile: '<640px',
    tablet: '640px-1024px',
    desktop: '>1024px'
  }
} as const;
