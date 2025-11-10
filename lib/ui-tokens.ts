export const uiTokens = {
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
  },
  layout: {
    sectionGapSm: "1rem",
    sectionGapLg: "1.5rem",
    gridGap: "1rem",
  },
  radii: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
  },
  typography: {
    display: { fontSize: "2rem", lineHeight: "1.2", fontWeight: 600 },
    h1: { fontSize: "1.5rem", lineHeight: "1.25", fontWeight: 600 },
    h2: { fontSize: "1.25rem", lineHeight: "1.3", fontWeight: 600 },
    h3: { fontSize: "1rem", lineHeight: "1.35", fontWeight: 600 },
    body: { fontSize: "0.9375rem", lineHeight: "1.6", fontWeight: 500 },
    bodySm: { fontSize: "0.875rem", lineHeight: "1.6", fontWeight: 500 },
    caption: { fontSize: "0.75rem", lineHeight: "1.4", fontWeight: 500 },
  },
  motion: {
    duration: "200ms",
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
  shadow: {
    card: "0 8px 24px -12px rgba(15, 23, 42, 0.35)",
    hover: "0 12px 36px -18px rgba(15, 23, 42, 0.4)",
  },
}

export type UiTokens = typeof uiTokens

