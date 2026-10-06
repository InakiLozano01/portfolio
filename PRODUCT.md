# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Four audiences, weighted equally (confirmed 2026-10-06):
- Recruiters and hiring managers deciding whether to interview Iñaki for an engineering role.
- Freelance or agency clients looking for someone to build business systems (factoring, real-estate CMS, screening platforms).
- Readers of the bilingual essays on the blog.
- People who arrive for the craft of the site itself and judge the design.

Visitors read in English or Spanish; both languages are first-class.

## Product Purpose
The personal site of Iñaki F. Lozano, a software engineer in Tucumán, Argentina. It presents who he is, his education, experience, skills and projects, publishes his essays, and turns interest into a conversation. Every one of these counts as success: a message or email, projects explored, the CV downloaded, a newsletter subscription or an essay read.

## Positioning
A working engineer in public administration (Court of Accounts of Tucumán: digital signatures, document and records systems, interoperability) who also ships his own products and writes long-form essays. Engineering and writing appear together, in two languages.

## Operating Context
- Next.js app router, `/en` and `/es` routes, deployed with Docker on a VPS behind PostgreSQL and Redis.
- Visitors arrive from LinkedIn, GitHub, search and shared essay links, on desktop and phones.
- An admin (`/admin`) edits every section, project, skill and blog post; the public site reads them from the API or server-seeded props.
- Newsletter is double opt-in; blog comments are moderated.

## Capabilities and Constraints
- All public content stays admin-editable: section texts, projects, skills, blog posts and contact details come from the CMS/API, never hard-coded. UI labels live in `dictionaries/en.json` and `dictionaries/es.json`.
- Existing routes stay: `/[lang]`, `/[lang]/projects/[slug]`, `/[lang]/blog`, `/[lang]/blog/[slug]`, `/[lang]/legal`, subscribe/unsubscribe flows.
- A single long home page is not required; per-section URLs are allowed.
- Build and tests run only in capped Docker containers, never directly on the VPS host.
- Known performance problem (audit 2026-08-21): sections that fetch after load appeared empty for seconds. Content must be visible fast.

## Brand Commitments
- The IL monogram (I bar, L, terminal-prompt `>>_` block) is kept as-is: `public/il-logo-mark.png`, `public/il-logo-icon.png`, `public/inakilozanodotcomlogo.png`, `il_new_logo.png`.
- Name forms: "Iñaki F. Lozano"; "Iñaki Fernando Lozano" in the copyright line. Always keep the ñ.
- The user asked to keep mainly the existing palette: navy #1a2433, bordeaux #800020, cream #faf8f5, coral #fd4345.
- Visual direction pinned by the user (2026-10-06): minimal cyberpunk on that palette, strongly animated, focused on computers, networks, the brain and AI. Themed metaphors (stadiums, cafés, paper files) felt like costume and "not me"; the site should feel like a premium personal site, not a metaphor. Revision the same day: no dark-void look and no gradient/glow "slop"; colour comes from flat fields assigned by role, with red-and-white contrast in the hero.

## Evidence on Hand
- 8 real projects with thumbnails, stacks and links (`/api/projects`).
- 32 skills in 8 categories (`/api/skills`).
- Experience: SSr Software Engineer at Tribunal de Cuentas de la Provincia de Tucumán (Nov 2023 – present), plus an earlier role.
- Education: Computer Engineering at Universidad Nacional de Tucumán (three exams remaining), secondary school as standard bearer.
- Bilingual essays (for example "The Blood of the Inevitable"), CV at `public/CV.pdf`, portrait at `public/pfp.jpg`, OG cards at `public/og-en.png` and `public/og-es.png`.
- No testimonials, client logos, metrics or press exist. Do not invent them.

## Product Principles
- Content first, fast: nothing a visitor came for may wait on a spinner.
- Proof over claims: show real projects, real roles and real writing rather than adjectives.
- Two languages, one voice: every surface works fully in English and Spanish.
- The site is itself a work sample: its craft is part of the argument.

## Accessibility & Inclusion
- WCAG 2.1 AA: keyboard navigation, visible focus, skip link, labelled icon links.
- All motion honours `prefers-reduced-motion`.
