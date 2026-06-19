---
name: SENTINEL
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#1e1200'
  on-tertiary: '#ffffff'
  tertiary-container: '#35260c'
  on-tertiary-container: '#a38c6a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#fadfb8'
  tertiary-fixed-dim: '#ddc39d'
  on-tertiary-fixed: '#271902'
  on-tertiary-fixed-variant: '#564427'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-desktop: 40px
  container-padding-mobile: 20px
  gutter: 24px
  section-gap: 64px
---

## Brand & Style

The design system is rooted in the philosophy of "Modern Human-Centric Tech." It bridges the gap between high-security rigor and approachable, premium consumer electronics. The brand personality is vigilant yet calm, sophisticated but accessible, evoking the quiet confidence of an elite concierge rather than a cold, industrial barrier.

The visual style is a hybrid of **Modern Minimalism** and **Glassmorphism**. It utilizes expansive whitespace, meticulous alignment, and layered transparency to create a sense of organized clarity. The interface should feel like a physical layer of protective glass over high-fidelity data—light, breathable, and unmistakably premium.

- **Target Audience:** High-net-worth individuals, enterprise security directors, and tech-forward homeowners.
- **Emotional Response:** Safety, clarity, premium quality, and effortless control.

## Colors

The palette is anchored by **Deep Indigo (#1E293B)**, providing a grounding, authoritative presence that replaces the common "tech purple" with a more professional, timeless tone. **Crisp White** and a range of **Slate Grays** form the foundation of the UI, ensuring high legibility and a clean "Apple-inspired" canvas.

Functional accents are used sparingly but vibrantly to indicate system status:
- **Emerald Green:** Used exclusively for "Secured," "Active," and "Safe" states.
- **Golden Amber:** Reserved for non-critical alerts, pending actions, or sensor warnings.
- **Soft Crimson:** Dedicated to active breaches, blocked access, and critical system failures.
- **Glass Tint:** A translucent white (rgba 255, 255, 255, 0.7) for elevated surfaces.

## Typography

This design system uses **Plus Jakarta Sans** across all levels to maintain a cohesive, modern, and slightly rounded aesthetic that feels human-centric. 

The hierarchy is strictly enforced through generous scale shifts. **Headline XL** and **LG** are used for high-level status overviews and dashboard titles, while **Label MD** is styled with increased letter spacing and uppercase casing to act as a clear technical indicator for sensor names and timestamps. Body text maintains a comfortable line height to ensure maximum readability during high-stress monitoring scenarios.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid** model. On desktop, content is contained within a 12-column grid with a maximum width of 1440px to ensure data density doesn't become overwhelming. 

Whitespace is treated as a first-class functional element, not an empty void. Large 64px gaps between major sections allow the eye to rest and emphasize the importance of each module. Margins are generous (40px on desktop) to reinforce the "premium" feel. Components should utilize an 8px base grid for internal padding, ensuring mathematical harmony across the UI.

## Elevation & Depth

Depth is conveyed through a sophisticated layering of **Glassmorphism** and **Ambient Shadows**. 

1.  **Base Layer:** The background (#F8FAFC) is solid and matte.
2.  **Surface Layer:** Primary cards use a white background with a subtle 1px border (#E2E8F0) and a soft, low-opacity shadow (0 4px 20px rgba(30, 41, 59, 0.05)).
3.  **Elevated Layer (Modals/Overlays):** These utilize a backdrop-blur (20px) with a semi-transparent white fill (rgba(255, 255, 255, 0.8)). This creates a "frosted glass" effect that keeps the underlying context visible while focusing the user's attention.

Shadows should never be pure black; they are always tinted with the Deep Indigo primary color to ensure they feel integrated into the environment.

## Shapes

The shape language is defined by exceptionally soft, "Human" curves. Large containers and dashboard modules must use a minimum radius of **24px (rounded-xl)**. This extreme rounding softens the "security" aspect of the product, making it feel like a consumer lifestyle choice rather than an intimidating piece of hardware. 

Small interactive elements like buttons and input fields use a **12px to 16px radius**, ensuring they remain distinct from the larger structural containers while maintaining the overall soft aesthetic.

## Components

- **Buttons:** Primary buttons use the Deep Indigo background with white text. Secondary buttons are "Ghost" style with a 1px Slate border. All buttons have a subtle 2px hover lift effect.
- **Status Chips:** Small, pill-shaped indicators with low-opacity backgrounds of the status colors (e.g., 10% Emerald Green background with 100% Emerald Green text).
- **Cards:** Large 24px rounded containers. For high-priority security feeds, cards may feature a subtle internal glow or glass effect.
- **Inputs:** Clean, white fills with a focus state that adds a 2px Deep Indigo ring. Labels are always positioned above the field in the **Label-sm** style.
- **Security Toggles:** Large, tactile switch components that provide haptic-like visual feedback when engaged, using Emerald Green for the "On" state to signify a secured area.
- **Data Visualizations:** Use thin, refined lines and soft gradients rather than solid blocks of color to maintain the high-end tech aesthetic.