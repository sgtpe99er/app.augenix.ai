# Design System Strategy: The Curator’s Canvas

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Atelier."** 

Unlike standard SaaS platforms that rely on aggressive grids and heavy containerization, this system treats the interface as a high-end editorial piece. We are moving away from "software UI" and toward "intellectual architecture." The design breaks the template look through **intentional asymmetry**, vast margins of white space (breathing room), and a sharp contrast between academic serif typography and functional sans-serif utility. This is an environment for deep thought, where the AI doesn't just "process," it "composes."

## 2. Color & Tonal Architecture
The palette is rooted in a single, high-clarity atmosphere. We avoid the "zebra-stripe" effect of alternating section backgrounds, favoring a consistent, singular plane.

*   **Primary Surface:** `#f7f9fb` (Surface). This is our base canvas. It must remain consistent across the entire journey to maintain an authoritative, gallery-like feel.
*   **The "No-Line" Rule:** To achieve a premium aesthetic, designers are **prohibited from using 1px solid borders** to define sections or large containers. Boundaries must be defined solely through vertical white space or subtle tonal transitions using the `surface-container` tiers.
*   **Surface Hierarchy & Nesting:** Use the surface tiers to create "nested" depth. 
    *   **Level 0 (Base):** `surface` (`#f7f9fb`)
    *   **Level 1 (Subtle Inset):** `surface-container-low` (`#f2f4f6`) for secondary utility bars.
    *   **Level 2 (Floating/Prominent):** `surface-container-lowest` (`#ffffff`) for cards or focus areas to create a soft, natural lift.
*   **The "Glass & Gradient" Rule:** For floating elements (Modals, Hover Menus), use semi-transparent surface colors with a `backdrop-blur` of 12px–20px. 
*   **Signature Textures:** For primary CTAs or high-impact hero moments, use a subtle radial gradient transitioning from `primary` (`#000000`) to `on-primary-fixed-variant` (`#003ea8`). This adds "soul" and prevents the black from feeling flat or "dead."

## 3. Typography: Intellectual Contrast
The typographic system relies on the tension between the "Humanist Serif" and the "Machine Sans."

*   **Display & Headlines (Newsreader):** Used for all `display-` and `headline-` tokens. This serif conveys history, authority, and curation. To match the logo’s sophisticated personality, use **Italics** sparingly for specific keywords within a headline to emphasize the "bespoke" nature of the AI.
*   **UI & Body (Inter):** Used for `title-`, `body-`, and `label-` tokens. Inter provides the technical "architectural" foundation. Its high x-height ensures readability against the complex serif headings.
*   **Hierarchy Note:** Maintain a high contrast in scale. A `display-lg` (3.5rem) should often be paired with a much smaller `body-md` (0.875rem) to create the wide-open, editorial "magazine" layout.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "digital" for this system. We achieve depth through atmospheric physics.

*   **The Layering Principle:** Depth is achieved by "stacking" surface tiers. Place a `surface-container-lowest` (#FFFFFF) element on top of a `surface` (#f7f9fb) background. This creates a natural, "paper-on-stone" lift without a single pixel of shadow.
*   **Ambient Shadows:** If a floating effect is functionally required (e.g., a dropdown), use an **Ambient Shadow**:
    *   Blur: 32px–64px.
    *   Opacity: 4%–6%.
    *   Color: Tinted with `on-surface` (`#191c1e`) to mimic natural light.
*   **The "Ghost Border" Fallback:** If a border is necessary for accessibility, use the `outline-variant` token at **20% opacity**. Never use 100% opaque borders for decorative containment.

## 5. Components
Primitive components should feel like architectural details—minimal, functional, and precise.

*   **Buttons:**
    *   **Primary:** Solid `primary` (Black) with `on-primary` (White) text. Corner radius: `0.25rem` (sm). The sharp corner reinforces the "Architectural" name.
    *   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
*   **Input Fields:** Use "Ghost Borders" (20% `outline-variant`). On focus, the border transitions to `primary` (Black) with a 1px weight. Labels should always use `label-md` in `on-surface-variant`.
*   **Cards:** Forbid the use of divider lines. Separate content using the Spacing Scale (8px, 16px, 24px). If a card needs to be distinct, use a `surface-container-lowest` background.
*   **Chips:** Use `full` roundedness (pill shape) to provide a soft contrast to the otherwise rectangular architecture of the system.
*   **Specialty Component - The "Curator's Feed":** For AI-generated lists, do not use borders between items. Use a `surface-container-low` background on hover to indicate interactivity.

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme vertical padding (e.g., 120px+) between major sections to let the serif typography "breathe."
*   **Do** use the Electric Blue (`on-primary-container`) specifically for interactive "AI-logic" moments—like a blinking cursor or a processing spark.
*   **Do** align text to a strict "Architectural" grid while allowing imagery or decorative serif initials to break that grid slightly.

### Don't:
*   **Don't** use "Card-itis"—the habit of putting everything in a boxed container. Let content sit directly on the `surface`.
*   **Don't** use traditional grey shadows. They muddy the clean Slate/Off-white palette.
*   **Don't** use bold weights for the Newsreader serif. Let the letterforms' elegance provide the weight, not the thickness.
*   **Don't** use 100% black text for long-form body copy; use `on-surface-variant` (`#45464d`) for a softer, more premium reading experience.