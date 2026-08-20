---
name: Lumina Editorial
colors:
  surface: '#f9f9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#747878'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#576500'
  on-secondary: '#ffffff'
  secondary-container: '#d4f039'
  on-secondary-container: '#5c6b00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c1c'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#d4f039'
  secondary-fixed-dim: '#b8d313'
  on-secondary-fixed: '#191e00'
  on-secondary-fixed-variant: '#414c00'
  tertiary-fixed: '#e4e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Poppins
    fontSize: 72px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Poppins
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
  headline-lg:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
  body-lg:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Helvetica, Arial, sans-serif
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Helvetica, Arial, sans-serif
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Helvetica, Arial, sans-serif
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  section-gap: 64px
---

## Brand & Style

The design system establishes an **Editorial Playful** aesthetic, merging the sophisticated, high-contrast world of print journalism with the kinetic energy of modern interaction. The visual language centers on generous negative space, intentional asymmetry, and the juxtaposition of geometric typography against vibrant accents.

The interface is designed to feel airy and premium, avoiding the cluttered "arcade" feel of traditional quiz platforms. It targets a professional yet creative audience—educators, event hosts, and modern brands—evoking a sense of precision, intellectual curiosity, and vibrant energy.

## Colors

The palette is anchored by a warm, tactile foundation to reduce eye strain, contrasted by a singular "high-voltage" accent.

*   **Primary (#000000):** Used for critical text, heavy borders, and high-impact UI elements.
*   **Secondary (#D4F039):** A neon lime used sparingly for call-to-actions, progress indicators, and active states. It provides the "pop" against the neutral base.
*   **Neutral/Surface (#FBF9F9):** The off-white "paper" background that provides editorial warmth.
*   **Semantic Accents:** Use a muted red (#BA1A1A) for errors, ensuring it remains distinct but balanced within the editorial tone.

## Typography

The typographic hierarchy utilizes the geometric clarity of **Poppins** for impact and the ubiquitous, high-legibility nature of the **System UI (SF Pro)** stack for functional content.

*   **Headlines & Big Numbers:** Use Poppins for question text, countdowns, and section titles. The bold weights should be used to create a strong visual anchor.
*   **UI & Body:** Use the system sans-serif stack for interactive elements, body copy, and labels to ensure a native, lightning-fast feel across devices.
*   **Scale:** On mobile, reduce display sizes significantly to maintain readability while preserving the generous whitespace characteristic of the design system.

## Layout & Spacing

The layout follows a **Fluid Editorial Grid**. While adhering to a 12-column structure on desktop, elements often break the grid with offset positioning to feel organic.

*   **Margins:** 24px on mobile, scaling up to 64px on desktop to emphasize the "airy" quality.
*   **Vertical Rhythm:** Use large gaps (64px+) between major sections, such as the question area versus answer choices, to allow for visual rest.
*   **Alignment:** Center-aligned layouts are preferred for active quiz states; left-aligned layouts are used for dashboards and results.

## Elevation & Depth

This design system avoids heavy shadows in favor of **Tonal Layering** and **Soft Ambient Occlusion**.

*   **The Paper Effect:** Surfaces are primarily flat, defined by subtle 1px borders (#000000 at 5% opacity).
*   **Soft Shadows:** High-priority cards use an extremely diffused, large-radius shadow: `0px 20px 40px rgba(0, 0, 0, 0.04)`.
*   **Floating Elements:** Decorative shapes sit behind main content layers, often with a slight blur to imply a shallow depth of field.

## Shapes

The shape language combines geometric precision with pill-shaped softness.

*   **Interactive Elements:** All buttons and inputs must be fully **Pill-shaped** to contrast with the sharp editorial typography.
*   **Containers:** Cards use a large **1.5rem (rounded-xl)** radius to feel modern and friendly.
*   **Decorative Blobs:** Use SVG-based, non-geometric shapes as background accents, filled with faint tints of the secondary color at 10% opacity.

## Components

*   **Pill Buttons:** Primary buttons are Solid Black with White text. Secondary buttons use Neon Lime with Black text.
*   **Editorial Cards:** Large white cards with 24px corner radius and a 1px border (10% opacity) instead of heavy shadows.
*   **Marketing Tags:** Labels should be rotated by -3 to -5 degrees to create a "zine" aesthetic.
*   **Progress Timers:** Thick circular stroke indicators (4px-6px) using the Neon Lime color.
*   **Input Fields:** Pill-shaped with a 1px border. Focus states highlight the border in the Primary color.
*   **Icons:** Use thin (1px or 1.5px) stroke weights; avoid filled icons to maintain the light feel.