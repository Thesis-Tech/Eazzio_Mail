export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, "JetBrains Mono", Menlo, Monaco, Consolas, monospace'
  },
  scale: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '22px',
    '2xl': '28px',
    '3xl': '36px'
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600
  },
  lineHeight: {
    body: 1.4,
    heading: 1.2
  }
} as const;
