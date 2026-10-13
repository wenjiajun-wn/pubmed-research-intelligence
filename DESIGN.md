---
name: PubMed Research Intelligence
description: Inspectable biomedical evidence in a restrained scientific dashboard.
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  chart-cyan: "#0891b2"
  text: "#0f172a"
  text-secondary: "#475569"
  muted: "#64748b"
  canvas: "#f6f8fb"
  surface: "#ffffff"
  surface-muted: "#f1f5f9"
  surface-table: "#f8fafc"
  surface-insights: "#fafdff"
  surface-blue: "#eff5ff"
  line: "#e3e8ef"
  control-line: "#dbe2eb"
  focus: "#93b5ff"
typography:
  display:
    fontFamily: 'Inter, "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "58px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: 'Inter, "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "31px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  title:
    fontFamily: 'Inter, "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "19px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  panel-title:
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: 'Inter, "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  reading:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.95
  label:
    fontSize: "12px"
    fontWeight: 500
  metric:
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.035em"
rounded:
  badge: "4px"
  compact-control: "5px"
  control: "6px"
  panel: "8px"
spacing:
  inline-small: "8px"
  inline: "12px"
  grid: "20px"
  panel-inset: "24px"
  reading-inset: "28px"
  section: "30px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-text:
    textColor: "{colors.primary}"
    size: "12px"
  search-field:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "7px 7px 7px 20px"
  topic-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.compact-control}"
    padding: "6px 9px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  metric-chip:
    backgroundColor: "{colors.surface-blue}"
    textColor: "{colors.primary}"
    rounded: "{rounded.badge}"
    padding: "4px 8px"
  navigation:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
---

# Design System: PubMed Research Intelligence

## Overview

**Creative North Star: "Inspectable scientific evidence"**

The confirmed world is a white and light-gray scientific SaaS interface. Compact controls, fine dividing rules, dense tables, and clear numeric hierarchy support researchers inspecting a query and its evidence. This name describes the shipped and user-approved direction; it is not a retrospective concept workshop.

White panels sit on a cool gray canvas. Blue marks actions, active navigation, linked evidence, and primary charts. Dark text carries the content; gray supports provenance and scope. The bundled Inter family provides one consistent voice across interface and charts, with Chinese text using the declared fallback stack.

**Key Characteristics:**

- Flat white panels with fine gray borders and gently curved corners.
- Dense evidence displays with distinct full-query and recent-sample scope.
- One type family, restrained blue actions, and supporting cyan data geometry.
- Responsive stacking and local table scrolling.
- Keyboard-visible controls and reduced-motion support.

Evidence: `frontend/src/styles/{base,layout,pages,dashboard,readability,responsive}.css`, `frontend/src/main.tsx`, and sampled SearchForm, Layout, Chart, DashboardCharts, DashboardPage, and DataSourcesPage components. Desktop and mobile fold captures in `.impeccable/review/` corroborate the source. This records the actual cascade, not every unused declaration.

## Colors

A cool neutral field carries a clear blue accent and a darker supporting cyan for country data.

### Primary

- **Evidence Blue** (`primary`): primary actions, active tabs, data-source links, metric emphasis, and publication curves.
- **Action Blue Hover** (`primary-hover`): primary button hover state.

### Secondary

- **Chart Cyan** (`chart-cyan`): supporting country bars. The build uses this darker cyan rather than the direction's requested #06B6D4. Word-cloud colors are local chart styling, not additional global accents.

### Neutral

- **Ink** (`text`): primary page content and numeric values.
- **Slate** (`text-secondary`): reading copy, secondary controls, and table details.
- **Muted Slate** (`muted`): provenance, supporting copy, and inactive navigation.
- **Cool Canvas** (`canvas`), **White Surface** (`surface`): page background and panels.
- **Muted Surface**, **Table Surface**, **Insights Surface**, and **Blue Surface**: contextual layering, table headers, insights, and metrics.
- **Fine Rule** (`line`), **Control Rule** (`control-line`): panel boundaries and control strokes.
- **Focus Blue** (`focus`): keyboard outline.

The sidecar's eight-step OKLCH strips are synthesized previews of these extracted colors, not shipped CSS ramps or additional normative tokens.

### Named Rules

**The Evidence Blue Rule.** Use blue for actions, selected navigation, references, and primary data emphasis, following the existing semantic assignments.

## Typography

**Display and Body Font:** locally bundled Inter, with Segoe UI, Microsoft YaHei, and sans-serif fallbacks. Four imported weights are 400, 500, 600, and 700; charts use Inter, sans-serif. There is no separate display or label family.

### Hierarchy

- **Display:** homepage headline; shrinks to 46px at the tablet breakpoint and 39px on mobile.
- **Headline:** dashboard query title; becomes 28px on mobile. Source titles use 33px on desktop and 28px at narrower widths; About uses 43px and 35px on mobile.
- **Title:** global section heading. Dashboard section headings use 20px, panel titles 15px, and panel titles become 16px at the wide and tablet rules, 14px on mobile.
- **Body:** root interface text; individual reading blocks use 12–13px. Methodology paragraphs use 1.85 line height and a 70ch maximum; About and expanded abstracts use 72ch.
- **Reading:** Chinese brief paragraphs; 13px on mobile.
- **Label:** button and navigation text. Existing 8–11px metadata is a compactness limitation, not a recommended new text scale.
- **Metric:** tabular numerals on KPI values; 35px at wide widths, 28px at 1100px, 29px at 800px, and 28px on mobile. Topic text has its own narrower desktop sizing; on mobile the later general KPI rule makes it 28px.

### Named Rules

**The Numeric Scan Rule.** Keep KPI values and numeric table columns tabular; align journal count columns to the right.

## Layout

The page and header cap at 1400px. Desktop side insets are 40px; at min-width 1500px they are 20px, at max-width 1100px they become 24px, and at max-width 560px they become 18px. The body minimum width is 320px.

The dashboard uses a broad trend panel beside a 350px insights column, with a 20px gap; the insights column becomes 300px at 1100px. Paired analysis panels use equal columns. Panels have 24px heading insets; the brief uses 28px inner padding. This is an observed set of reused spacing values, not a strict universal eight-point grid.

At max-width 800px, overview and paired panels stack, the KPI strip has three columns, themes have two columns, and source records have two columns. At max-width 1100px the theme grid first reduces from five to three columns. At max-width 560px the header wraps navigation onto a second row, search controls wrap, KPIs use two columns with the topic spanning both, themes and brief become single-column, source records and methodology become single-column, and panel headings use 17px horizontal insets.

Wide paper tables retain a 680px minimum width inside an independently scrollable wrapper. Section navigation can scroll horizontally on mobile. Print rules remove application navigation and action controls, remove the container cap, and preserve panel blocks.

## Elevation & Depth

The interface is flat at rest. Borders and pale contextual backgrounds separate information; panels and buttons have no ambient shadow. The research-diversity disclosure is the observed floating exception.

### Shadow Vocabulary

- **Disclosure lift:** `0 4px 12px #0f172a12` on the metric explanation, with a thin border and white background.

### Named Rules

**The Flat Panel Rule.** Use borders and tonal surfaces for panel separation; reserve the observed lift for the floating explanation.

## Shapes

Panels and the search enclosure use the panel radius. Buttons and explanation popovers use the control radius; compact suggestion and sorting controls use the compact-control radius; badges and metric chips use the badge radius. Boundaries are fine one-pixel strokes. Circular dots indicate state, and chart bars have a small rounded end.

## Components

### Buttons

Compact, labeled actions with inline Lucide icons. Primary and secondary variants share the control radius, 40px minimum height, and label role; primary has blue fill and white text. Secondary has a white fill and control-rule stroke. Primary hover darkens; secondary hover uses a muted surface and darker stroke. Text actions are blue and underline on hover. The dashboard search action is a compact 34px variant. Disabled buttons have opacity 0.55 and a not-allowed cursor.

All focusable controls use a 3px blue outline with a 3px offset, except the search input, whose enclosure changes border color through focus-within. Button background and color transitions last 0.15s.

### Chips

Suggestion chips are white, stroked, and gently rounded; hover shifts border and text toward blue. Metric chips use pale blue fill and tabular blue numbers. Retrieval-status badges use a small dot and accompanying text; live status uses green local status colors. Meaning is carried by the text as well as color.

### Cards / Containers

White bordered panels provide the shared container. Headings use compact semibold titles and a supporting scope line. Insights have a near-white blue tint. Avoid treating a panel as a complete padding primitive: headings, chart footnotes, tables, and reading content each have their observed internal spacing.

### Inputs / Fields

Search is a single enclosure containing the Lucide search icon, labeled text input, sample-size select, and primary submit action. The text input is flexible with a zero minimum width; the enclosure indicates focus. Home and dashboard use full and compact variants, respectively. Mobile wraps the controls while preserving the topic field's width. Labels are accessible even when visually hidden.

### Navigation

Main navigation uses muted labels, blue hover text, and a blue bottom rule for the active route. Dashboard section links use the same selected-state language. Mobile main navigation wraps below the brand. The skip link appears on focus.

### Evidence Displays

KPI values appear within one white strip separated by internal rules. Scope and provenance explain whether a count covers the full query or the recent sample. Paper rows retain title, identifiers, ranking, journal metrics, and expandable abstracts. Charts include accessible textual labels; publication trends shade the partial year and explain it in a footnote.

### Numbered Research Content

The five research directions and six brief items retain the explicitly requested numbering. Methodology categories use plain headings. These are content structures for those surfaces, not a global eyebrow or kicker style.

### Disclosure and Motion

Research diversity uses a native details/summary disclosure with a Lucide Info icon and an accessible summary label. Its floating explanation defines the metric without asserting research quality. Motion is limited to button states, a 0.5s progress transform, a 1.6s linear loading rotation, and 450ms chart entry animation. Reduced-motion preference disables CSS animation/transitions and chart animation.

## Do's and Don'ts

### Do:

- **Do** preserve the white/light-gray scientific SaaS world, bundled Inter, and panel radius.
- **Do** use blue consistently for actions, selected navigation, references, and primary data.
- **Do** keep full-query counts visibly distinct from recent-sample statistics.
- **Do** retain keyboard focus, accessible control labels, and reduced-motion behavior.
- **Do** use local scrolling for wide paper tables and stack analytic panels at the observed breakpoints.
- **Do** retain the requested research-direction and brief numbering in those content structures.

### Don't:

- **Don't** add ambient panel shadows to the flat panel vocabulary.
- **Don't** turn local chart colors into unrelated interface accents.
- **Don't** turn the research numbering into decorative kickers or numbered methodology headings.
- **Don't** present missing values as fabricated data.

Not canonized or repaired: the darker chart cyan differs from the pinned cyan, and 8–11px metadata remains a legibility limitation; documentation preserves observed behavior without making either a rule for future surfaces. Removed breadcrumb and methodology-number styles remain unused source declarations and are excluded from this system.

