---
name: Iñaki F. Lozano
description: The public site as a living neural map of real projects, technologies and writing, set in flat colour fields, in English and Spanish.
colors:
  navy: "#1a2433"
  navy-raise: "#263547"
  cream: "#faf8f5"
  paper: "#f0ece6"
  white: "#ffffff"
  bordeaux: "#800020"
  bordeaux-deep: "#6b001b"
  coral: "#fd4345"
  coral-hi: "#ff6b6d"
  blush: "#ffb3b5"
  ink-soft: "#3b4657"
  ink-dim: "#5c6677"
  mist-soft: "#c3c9d3"
  mist-dim: "#9aa4b4"
  rose-soft: "#e8d3d5"
  rose-dim: "#dcbac0"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(3.1rem, 7.4vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
    fontFeature: "\"ss01\", \"cv11\""
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  statement:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3.4vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.75
  body-sm:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  data:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  data-sm:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  md: "6px"
  xl: "16px"
  panel: "24px"
  full: "9999px"
spacing:
  gutter-mobile: "20px"
  gutter: "32px"
  card-pad: "24px"
  panel-pad: "40px"
  section-y-mobile: "80px"
  section-y: "112px"
  container: "1400px"
components:
  button-primary-navy:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.navy}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
    typography: "{typography.body-sm}"
  button-primary-navy-hover:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.navy}"
  button-primary-cream:
    backgroundColor: "{colors.bordeaux}"
    textColor: "{colors.cream}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
    typography: "{typography.body-sm}"
  button-primary-cream-hover:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  chip-tech:
    backgroundColor: "rgba(26, 36, 51, 0.06)"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  card-project:
    backgroundColor: "{colors.white}"
    textColor: "{colors.navy}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-pad}"
  panel:
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-pad}"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.navy}"
    rounded: "{rounded.xl}"
    padding: "0 20px"
    height: "48px"
  nav-link:
    textColor: "{colors.mist-dim}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.label}"
  nav-link-active:
    textColor: "{colors.cream}"
---

# Design System: Iñaki F. Lozano

## Overview

**Creative North Star: "The Living Synapse"**

The public site is a neural map in which the work itself forms the network. Projects and the technologies they use are real nodes, wired by thin synapses, and coral signals travel along them. The map is laid out as a sequence of flat colour fields, one per section, and each field is chosen by role. Navy is the machine: the hero swarm, the education and experience trace, the skills constellations, the header and the footer. Cream and paper are for reading: the statement, about, projects, writing and every detail-page body. Bordeaux is the personal voice, used for contact. The world is scoped to the `.synapse` frame (home, project, blog and legal pages). The admin keeps its own light theme and is not governed by this file.

The surfaces are flat and calm. There are no gradients, glows, grain or duotone. Depth comes from the change from one field to the next, from hairlines, from white cards on cream and from an image overlapping a band edge. Motion is the main expressive layer. The hero particles assemble the IL monogram and then dissolve into a turning brain. Names decode, headings rise out of a blur, the trace fills as the reader scrolls, and every skills synapse carries a travelling signal. All of it honours reduced motion. The world turns down the category's dark bento grid and terminal costume. There are no fake terminals and no fake dashboards, and the data shown is real.

**Key Characteristics:**
- Flat colour fields by role: navy for the machine, cream and paper for reading, bordeaux for contact. No section is dark by default.
- Components read role colours (fg, fg-soft, fg-dim, line, surface, signal, signal-text, action, on-action) from their field. They never hard-code a hex.
- Coral is signal only: nodes, live dots, traces, synapse dashes, the active underline, progress and focus.
- No gradients, glows, drop shadows, grain or colour washes on imagery.
- Geist for all reading text. Geist Mono only for data: dates, counts, character limits, canvas labels and language codes.
- Fully rounded controls; 16px cards and fields; 24px panels; 1px hairlines.

## Colors

The palette is four flat fields (navy, cream, paper, bordeaux). Coral appears in all of them as the signal.

### Primary
- **Signal Coral** (coral): the signal on navy and cream fields. It colours section-heading nodes, live dots, the scroll-drawn trace, skills synapse dashes and skill nodes, the hero swarm's firing neurons and mark pixels, the active nav underline, the header progress bar, the footer sweep, experience bullet dashes, the focus outline, the caret and the text selection (at 30 percent). On navy fields it is also the hover fill of the primary button, with navy text.
- **Coral Hi** (coral-hi): readable signal text on navy (signal-text), used for required-field asterisks and error messages there.
- **Blush** (blush): the signal and the signal text on the bordeaux field, where pure coral would vibrate against the ground.

### Secondary
- **Bordeaux** (bordeaux): the contact field, the action fill on cream and paper (primary buttons, the essay-row arrow on hover), the readable signal text on cream (inline links such as "Visit Ethos", prose links, form errors), and the project-card hover border.
- **Bordeaux Deep** (bordeaux-deep): the surface role inside the bordeaux field.

### Neutral
- **Navy** (navy): the machine field and the page ground behind every field. It is also the text colour on cream and paper, the on-action text over cream and coral fills, and the hover fill of primary buttons on cream.
- **Navy Raise** (navy-raise): the surface role on navy.
- **Cream** (cream): the reading field and the text colour on navy and bordeaux. On navy and bordeaux it is also the action fill (primary buttons) and the active segment of the EN/ES pill.
- **Paper** (paper): the writing field, one quiet step darker than cream so the essays read as their own room.
- **White** (white): the surface role on cream and paper, used for project cards and form fields.
- **Ink Soft / Ink Dim** (ink-soft, ink-dim): fg-soft and fg-dim on cream and paper, used for leads, subtitles and prose (soft) and for metadata, placeholders and mono data (dim).
- **Mist Soft / Mist Dim** (mist-soft, mist-dim): fg-soft and fg-dim on navy, with the same roles.
- **Rose Soft / Rose Dim** (rose-soft, rose-dim): fg-soft and fg-dim on bordeaux.
- **Hairlines**: the line role is the field's own text colour at low alpha. Dividers and card edges use 7 to 12 percent, control outlines 10 to 25 percent, and hover lifts outlines to 40 to 60 percent.

### Named Rules
**The Field By Role Rule.** Every section is one flat field chosen by what it does: navy for the machine, cream or paper for reading, bordeaux for the personal voice. A component takes its colours from the field's roles, so the same card or button is correct on any field without a variant.

**The Coral Is Signal Rule.** Coral marks a signal, a live state, focus, position or progress. It is never a background block, a section fill or a decorative wash. Readable text that carries signal meaning uses the signal-text role (bordeaux on cream, coral-hi on navy, blush on bordeaux), never raw coral on a light field. The one coral fill is the transient hover of a primary button on a navy field.

## Typography

**Display Font:** Geist (with system-ui, sans-serif)
**Body Font:** Geist (with system-ui, sans-serif)
**Label/Mono Font:** Geist Mono (with ui-monospace, SFMono-Regular, Menlo, monospace)

**Character:** One grotesque family carries the whole voice. It is set tight and semibold at display sizes and relaxed in prose. The mono is a data face, never a costume. Stylistic sets ss01 and cv11 are on throughout the world.

### Hierarchy
- **Display** (600, clamp(3.1rem, 7.4vw, 6rem), 0.95, -0.04em): the hero name only, decoded from scrambled glyphs on arrival. Project-page titles use a smaller step (clamp(2.4rem, 5.5vw, 4.5rem), 1.02, max 20ch), and essay titles a smaller one again (clamp(2.2rem, 5vw, 3.75rem), 1.05, centred, max 22ch). The footer name runs larger (clamp(3rem, 11vw, 10rem), 1, -0.05em).
- **Headline** (600, 2.25rem / 3rem / 3.75rem at base / sm / lg, -0.035em): section headings, always preceded by the signal node, with balanced wrapping.
- **Statement** (500, clamp(1.6rem, 3.4vw, 3rem), 1.2, -0.03em): the scroll-lit statement on cream under the hero. Essay-row titles sit in the same band at 600 (clamp(1.6rem, 3.2vw, 2.75rem), 1.08).
- **Title** (600, 1.5rem to 1.875rem, -0.025em): role titles and project-card titles.
- **Body** (400, 1.125rem, 1.75): about-text and leads (max 60 to 65ch). Long-form prose uses fg-soft at 1.8 line-height, max 72ch on project pages.
- **Body small** (400, 15px): card subtitles, button labels and input text.
- **Label** (500, 13px): nav links. Skill names in the constellations run at 14px medium.
- **Data** (Geist Mono 400, 13px, or 11px for counts): dates and periods, skill and project counts, character counters, the EN/ES codes and the hero swarm's project labels (11px, 500; section labels use Geist 600 12px).

### Named Rules
**The Mono Is Data Rule.** Geist Mono sets only values a machine would emit: dates, counts, limits, codes and canvas labels. Role lines, headings, leads and buttons stay in Geist.

**The Tight Display Rule.** Letter-spacing tightens with size: about -0.02em at 1.25 to 2rem, -0.03em at 2 to 3rem, and -0.04em to -0.05em at display sizes. Body text keeps normal tracking.

## Layout

The container is a single 1400px column with 20px gutters on phones and 32px from sm (640px) upward. Breakpoints are Tailwind's defaults, and lg (1024px) is the main split point. Each section is a full-bleed field with its content inside the container, padded 80px vertically on phones and 112px from md. Projects use 96 to 128px, and the statement 112 to 160px. Section heading blocks are capped at 48rem.

The page is one long scroll, and the field changes at every role boundary: navy hero, cream statement and about, navy education, experience and skills, cream projects, paper writing, bordeaux contact, navy footer. The hero is full-bleed and full-height (100dvh). The swarm fills the frame and settles on the right, and the name block sits left in 620px. On scroll the swarm scales to 1.25 and fades while the copy drifts up 80px. On phones the copy rises to the top. Two-column splits use fractional grids: 5/7 for about, 4/6 for experience (meta on the left, bullets on the right), 5/6 for contact and 4/7 for the newsletter panel. Education and Experience share one continuous vertical trace on the left edge (32px indent, 56px from md). The trace reaches into the section padding, so the two sections join into one line. Projects pin for a horizontal pan on desktop (cards min(440px, 33vw) wide and up to 500px tall, 24px gap). On smaller screens or under reduced motion they fall back to a two-column grid. The skills constellations sit in a 2- or 3-column grid and collapse to branch lists on phones.

Detail pages run in a 5xl (64rem) column. A project page opens on a navy title band (128 to 160px top, 144px bottom), and its thumbnail overlaps 96px up out of the cream body into the band. Blog and legal pages are cream throughout.

**The One Column Rule.** Content aligns to the 1400px container. Only the fields themselves, the hero swarm and the projects pan track run full-bleed.

## Elevation & Depth

The system is flat. No element casts a shadow or a glow, no surface carries a gradient, and there is no grain or noise layer. Depth comes from three things. The first is the change of field: navy against cream reads as a step in place, not a lift. The second is the white surface on cream and paper (project cards, form fields), edged by a hairline. The third is overlap: the project-page thumbnail crosses the navy band edge, and an inner panel of one field sits inside another (a cream form inside bordeaux contact, a navy newsletter panel inside paper writing). The header is the only translucent layer. Once the page scrolls it becomes navy at 90 percent with a medium backdrop blur and a hairline bottom edge.

### Named Rules
**The Flat Field Rule.** Nothing glows and nothing casts a shadow. A raised or active element changes its border, its fill or its position, never its shadow. Visible colour gradients, bloom fields, grain and colour washes on photographs have no place in this world. One-pixel rings are borders, not shadows.

## Shapes

Controls are fully rounded: buttons, chips, the language pill, icon buttons, the search field and the newsletter field. Cards and contact fields use a 16px radius, and the inner form and newsletter panels use 24px. The default focus outline is 2px in the signal colour, at a 3px offset with a 4px radius. Nodes are circles: a solid signal dot for anything live, a hollow ring at 50 percent of the line colour for anything past, and soft square-ish points in the canvas. The portrait is a circle in natural colour with a 1px ring, inside two thin counter-rotating orbit rings. Borders are always 1px hairlines.

## Components

### Buttons
Pill-shaped and plain; the fill comes from the field.
- **Shape:** full pill (rounded.full), 48px tall, or 44px on project pages.
- **Primary:** the field's action fill and on-action label: cream with navy text on navy and bordeaux fields, bordeaux with cream text on cream and paper. The label is 15px medium with 24 to 28px horizontal padding and a 16px icon (1.75 stroke) that nudges toward its direction on hover.
- **Hover / Focus:** on navy fields the fill turns coral with navy text. On cream and paper it turns navy. The transition is 300ms. Focus uses the global signal outline. On the hero the CTAs are magnetic and follow the pointer slightly.
- **Ghost:** transparent with a 1px line outline at 15 to 25 percent and an fg label. Hover lifts the outline to 40 to 60 percent. Social pills in contact use the same shape, and hover moves the outline to the signal at 70 percent over a 6 percent signal wash.

### Chips
- **Style:** pill, no outline, fg at 6 percent fill, fg-soft 12px medium text, a 12px technology icon. Project-page chips are 36px with a 10 percent line outline. Phone skill chips are 40px at 7 percent with a signal dot and a mono count.
- **State:** chips are static labels. There is no selection or filtering.

### Cards / Containers
- **Corner Style:** 16px for project cards, 24px for panels.
- **Background:** the white surface on cream. The 16:9 image well is fg at 4 percent with a hairline bottom edge, and the image scales to 1.04 on hover over 700ms.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** a line hairline at 12 percent, which turns solid bordeaux on hover over 300ms.
- **Internal Padding:** 24px, or 28px from sm.
- **Tilt:** with a mouse, the card tilts slightly toward the pointer. Every card stays at full prominence, with no selection and no dimming.
- **Panels:** a panel is a whole field nested in another, rounded to 24px, padded 24px rising to 40px.

### Inputs / Fields
- **Style:** the surface fill (white on cream), a line outline at 15 percent, a 16px radius (pill for search and newsletter), 48px tall, 20px inline padding, 15px fg text, an fg-dim placeholder and a signal caret. The label sits above in fg-soft 14px, and a mono 11px character counter sits right-aligned in fg-dim.
- **Focus:** the outline shifts to the signal at 70 percent.
- **Error:** a solid signal outline and a signal-text message beneath with `role="alert"`.

### Navigation
- **Style:** fixed slim navy bar, 64px tall, transparent over the hero. The IL mark (26px) and name sit on the left, centred 13px medium links (fg-dim, turning fg on hover and when active), and the EN/ES pill on the right. The pill is mono 11px uppercase, and its active segment is a cream fill with navy text.
- **Active:** a 1px signal underline that slides between links as a shared layout element. A 2px coral progress bar along the bar's bottom edge tracks the scroll.
- **Scrolled:** navy at 90 percent with backdrop blur and a hairline bottom edge.
- **Mobile:** a 40px round menu button opens a solid navy overlay below the bar. Links are 30px semibold with hairline dividers, and the current one is marked by an 8px signal dot.
- **Skip link:** a cream pill with navy text that appears on focus.

### Section Heading (signature)
Every section opens with its headline preceded by a 10px signal node, and it rises out of a 10px blur as it enters view. On trace sections the node sits on the trace line, so the heading is part of the signal path. An optional fg-soft lead follows in body size.

### Signal Trace and Live Dot (signature)
A 1px line at 9 percent runs down Education and Experience on navy. A coral copy fills it as the reader scrolls, smoothed with a spring. Each entry hangs on a node: a pulsing coral live dot (2.4s) for anything ongoing, and a hollow ring for anything finished. Periods are set in mono 13px fg-dim above the entry title. Experience bullets are 16px coral dashes at 70 percent.

### Neural Swarm (signature)
The hero canvas is a particle swarm on navy that moves through three scenes: identity, mind and machine. Cream particles fly in and assemble into the IL monogram, sampled from `public/il-logo-mark.png`; the mark's red pixels land coral. The mark dissolves into a breathing, rotating 3D brain on a flat bordeaux disc, with a fine cream orbit ring, cream synapses and cascading cream signals. A lub-dub heartbeat ring radiates every 2.8 seconds through the brain and the surrounding dot field. Sections and projects ride on front-facing neurons; hovering shows a cream tag, and clicking scrolls to the section or opens the project. Visitors drag to rotate the brain, with inertia. After 16 seconds untouched, the swarm becomes a processor: the disc morphs into a rounded bordeaux square, with a die frame, pins, traces to vias and the monogram engraved at the core, while coral-headed pulses race in along the traces. About 6 seconds later it collapses into the mark and grows back into the brain. Tapping the chip or the mark returns to the brain. An interrupted transition continues from the particles' current positions. Behind every scene, an ethos.ar-style dot grid parts around the pointer, and a few streaks drift toward the centre. Under reduced motion it renders one static brain.

### Skills Constellations (signature)
Each skill category is a hub, a 10px line ring around a 4px coral core, with its name below in 13px semibold uppercase fg-soft and a mono count. Skill nodes sit on curved synapses at 30 percent line. Each node is a coral dot sized by how many projects use the skill, ringed by the field colour, and labelled 14px medium with its icon and a mono project count. The section is static: every node is at full prominence, and every synapse carries a travelling coral signal (2px, staggered, 2.6 to 3.4s loops). On phones each category becomes a branch list.

### Portrait
The about portrait is a circular photo in natural colour with a 1px line ring at 15 percent. Two thin orbit rings counter-rotate around it: an inner dotted ring at 20 percent carrying one coral bead (38s), and an outer solid ring at 12 percent carrying an fg bead (64s, reversed). It drifts 40px with scroll parallax and is sticky on desktop.

### Essay Rows
Essays form a ruled list on paper, with no cards. Each row is a mono date column, a large semibold title with an fg-soft subtitle (max 60ch) and a 48px round arrow button. On hover a 4 percent fg wash fades in behind the row, the title slides 8px, and the arrow rotates 45 degrees and fills with the action colour. A navy newsletter panel follows the list.

### Long-form Prose
Blog and project prose is set in fg-soft at 1.125rem with 1.8 line-height, left-aligned. Headings and strong text use fg at -0.02em. Links use signal-text with a 40 percent underline offset 4px, and blockquotes carry a 2px signal left rule on a 4 percent line wash. Inline code sits on a 7 percent line wash, and pre blocks are navy with cream text. Inline colours from the editor are overridden so the field's roles win.

## Do's and Don'ts

### Do:
- **Do** assign each section one flat field by role (navy machine, cream or paper reading, bordeaux contact) and let components read fg, line, surface, signal and action from it (The Field By Role Rule).
- **Do** keep coral for signals: nodes, live dots, traces, synapse dashes, the active underline, progress and focus (The Coral Is Signal Rule).
- **Do** use the signal-text role for readable signal text: bordeaux on cream, coral-hi on navy, blush on bordeaux.
- **Do** build depth from field changes, white surfaces with hairlines and overlap, never from shadow (The Flat Field Rule).
- **Do** set dates, counts, limits and canvas labels in Geist Mono, and everything a person reads as prose in Geist.
- **Do** make graph, swarm and trace visuals from real data (projects, technologies, roles).
- **Do** run entrance motion in CSS (synapse-rise) where it must not hide content before hydration, and keep every animation under the reduced-motion settings (MotionConfig reducedMotion="user" plus the CSS reduce rule).
- **Do** keep controls as pills and cards at a 16px radius.

### Don't:
- **Don't** use colour gradients, radial blooms, glow shadows, drop shadows, grain or noise overlays.
- **Don't** colour-wash or duotone photographs. The portrait and project thumbnails show natural colour.
- **Don't** make the site dark by default. Reading sections sit on cream or paper.
- **Don't** use coral as a background block, a section fill or body text on a light field.
- **Don't** build fake terminals, command prompts or fake dashboards. The IL monogram's prompt block is the only terminal reference, and it belongs to the mark.
- **Don't** set role lines, leads, headings or buttons in Geist Mono to look "technical".
- **Don't** lay sections out as a bento grid of cards. Cards belong to projects. The other sections are traces, constellations, ruled lists and prose.
- **Don't** put a small label or eyebrow above a heading. A section opens with its signal node and its headline.
- **Don't** apply this world to the admin. It keeps its own light theme.
