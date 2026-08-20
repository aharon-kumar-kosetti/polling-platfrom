/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-lowest": "#ffffff",
        "on-surface-variant": "#444748",
        "surface-bright": "#fbf9f9",
        "surface-container-highest": "#e4e2e2",
        "on-primary-fixed-variant": "#474646",
        "tertiary-fixed-dim": "#c8c7bf",
        "surface-container": "#efeded",
        "tertiary": "#000000",
        "primary-fixed": "#e5e2e1",
        "on-tertiary-container": "#85847d",
        "surface-container-high": "#e9e8e7",
        "surface": "#fbf9f9",
        "on-error-container": "#93000a",
        "secondary-fixed-dim": "#b8d315",
        "inverse-on-surface": "#f2f0f0",
        "surface-dim": "#dbdad9",
        "on-background": "#1b1c1c",
        "tertiary-fixed": "#e4e2db",
        "on-tertiary-fixed": "#1b1c17",
        "error-container": "#ffdad6",
        "primary-fixed-dim": "#c8c6c5",
        "inverse-surface": "#303031",
        "on-error": "#ffffff",
        "inverse-primary": "#c8c6c5",
        "on-primary-fixed": "#1c1b1b",
        "secondary": "#576500",
        "outline-variant": "#c4c7c7",
        "on-secondary": "#ffffff",
        "surface-container-low": "#f5f3f3",
        "surface-tint": "#5f5e5e",
        "tertiary-container": "#1b1c17",
        "primary": "#000000",
        "surface-variant": "#e4e2e2",
        "on-primary": "#ffffff",
        "secondary-container": "#d4f039",
        "on-surface": "#1b1c1c",
        "on-secondary-fixed-variant": "#414c00",
        "on-secondary-container": "#5c6b00",
        "on-tertiary": "#ffffff",
        "error": "#ba1a1a",
        "on-tertiary-fixed-variant": "#474741",
        "secondary-fixed": "#d4f039",
        "primary-container": "#1c1b1b",
        "background": "#fbf9f9",
        "outline": "#747878",
        "on-secondary-fixed": "#191e00",
        "on-primary-container": "#858383"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        "section-gap": "64px",
        "container-padding": "24px",
        "gutter": "16px",
        "unit": "8px"
      },
      fontFamily: {
        "body-md": ["Plus Jakarta Sans"],
        "display-sm": ["EB Garamond"],
        "display-lg": ["EB Garamond"],
        "label-md": ["Plus Jakarta Sans"],
        "headline-lg-mobile": ["EB Garamond"],
        "body-lg": ["Plus Jakarta Sans"],
        "headline-lg": ["EB Garamond"],
        "label-sm": ["Plus Jakarta Sans"]
      },
      fontSize: {
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-sm": ["48px", { lineHeight: "1.1", fontWeight: "600" }],
        "display-lg": ["72px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        "label-md": ["14px", { lineHeight: "1.0", letterSpacing: "0.02em", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "1.2", fontWeight: "500" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "1.0", fontWeight: "700" }]
      }
    }
  },
  plugins: [],
}
