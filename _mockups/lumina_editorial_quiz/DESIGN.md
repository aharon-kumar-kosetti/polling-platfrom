---
name: Lumina Editorial Quiz
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#576500'
  on-secondary: '#ffffff'
  secondary-container: '#d4f039'
  on-secondary-container: '#5c6b00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c17'
  on-tertiary-container: '#85847d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#d4f039'
  secondary-fixed-dim: '#b8d315'
  on-secondary-fixed: '#191e00'
  on-secondary-fixed-variant: '#414c00'
  tertiary-fixed: '#e4e2db'
  tertiary-fixed-dim: '#c8c7bf'
  on-tertiary-fixed: '#1b1c17'
  on-tertiary-fixed-variant: '#474741'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  display-lg:
    fontFamily: ebGaramond
    fontSize: 72px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-sm:
    fontFamily: ebGaramond
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
  headline-lg:
    fontFamily: ebGaramond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: ebGaramond
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
  body-lg:
    fontFamily: plusJakartaSans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: plusJakartaSans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: plusJakartaSans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: plusJakartaSans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  section-gap: 64px
---

## Brand & Style

This design system establishes an "Editorial Playful" aesthetic. It merges the sophisticated, high-contrast world of print journalism with the kinetic energy of modern live interaction. The visual language centers on generous negative space, intentional asymmetry, and the juxtaposition of classic serif typography against vibrant, high-energy accents.

The interface should feel airy and premium, avoiding the cluttered "arcade" feel of traditional quiz platforms. It targets a professional yet creative audience—educators, event hosts, and modern brands—evoking a sense of precision, intellectual curiosity, and vibrant energy.

## Colors

The palette is anchored by a warm, tactile foundation to reduce eye strain during long sessions, contrasted by a singular "high-voltage" accent.

*   **Primary (#151515):** Used for all critical text, heavy borders, and high-impact UI elements.
*   **Secondary (#D6F23C):** A neon lime-yellow used sparingly for call-to-actions, progress indicators, and highlight states. It should "pop" against both the cream and black.
*   **Tertiary/Base (#F2F0E8):** The off-white "paper" background that provides the editorial warmth.
*   **Semantic Accents:** Use a soft muted red for errors and a deep forest green for success, ensuring they are slightly desaturated to maintain the editorial tone.

## Typography

The typographic hierarchy relies on the contrast between the intellectual **EB Garamond** and the approachable, rounded **Plus Jakarta Sans**. 

*   **Headlines & Big Numbers:** Use the serif for question text, large countdowns, and section titles. Italics should be used for emphasis or sub-captions to lean into the editorial feel.
*   **UI & Body:** Use the sans-serif for interactive elements, body copy, and labels. 
*   **Scale:** On mobile, reduce the serif display sizes significantly to maintain readability, but retain the negative space around them.

## Layout & Spacing

The layout philosophy follows a **Fluid Editorial Grid**. While it adheres to a standard 12-column structure on desktop, elements often "break" the grid with organic blob overlays or offset positioning to feel less rigid.

*   **Margins:** 24px on mobile, 48px-64px on desktop to emphasize the "airy" quality.
*   **Vertical Rhythm:** Use large gaps (64px+) between major sections (e.g., Question area vs. Answer choices) to allow the eye to rest.
*   **Alignment:** Center-aligned layouts are preferred for active quiz states; left-aligned editorial layouts are preferred for results and dashboards.

## Elevation & Depth

This design system avoids heavy shadows in favor of **Tonal Layering** and **Soft Ambient Occlusion**.

*   **The Paper Effect:** Surfaces are primarily flat, defined by subtle 1px borders (#000000 at 5% opacity).
*   **Soft Shadows:** High-priority cards (like the current question) use an extremely diffused, large-radius shadow: `0px 20px 40px rgba(21, 21, 21, 0.04)`.
*   **Floating Elements:** Blobs and decorative shapes should sit behind the main content layers, often with a slight blur to imply a shallow depth of field.

## Shapes

The shape language is a mix of geometric precision and organic softness. 

*   **Interactive Elements:** All buttons and inputs must be fully **Pill-shaped** (radius: 999px).
*   **Containers:** Cards and content blocks use a large **24px radius** (rounded-xl) to feel friendly and modern.
*   **Organic Blobs:** Use SVG-based, non-geometric blob shapes as background accents. These should be filled with very faint tints of the secondary color (#D6F23C at 10% opacity).

## Components

*   **Pill Buttons:** Primary buttons are Solid Black (#151515) with White text. Secondary buttons use the Neon Lime (#D6F23C) with Black text. 
*   **Editorial Cards:** Large white or cream cards with 24px corner radius. Use a 1px border (#151515 at 10% opacity) instead of a heavy shadow.
*   **Marketing Tags:** Labels or "New" badges should be rotated by -3 to -5 degrees to create a "pasted-on" zine aesthetic.
*   **Progress Timers:** Circular stroke indicators. The stroke should be thick (4px-6px) using the Neon Lime color, thinning as time expires.
*   **Input Fields:** Pill-shaped with a subtle inset shadow or a simple 1px border. Focus state should highlight the border in the Primary color.
*   **Icons:** Use thin (1px or 1.5px) stroke weight icons. Avoid filled icons to maintain the light, airy feel.