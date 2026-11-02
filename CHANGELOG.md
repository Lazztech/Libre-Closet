# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

#### Added

- Calendar Month and Week view toggle: view scheduled outfits across the entire month in a responsive 7-column calendar grid or drill down into the week view
- Mobile-optimized month calendar view displaying vertically stacked top and bottom garment photos per day with multi-outfit indicators
- Calendar Jump to Date picker: navigate directly to any date in the past or future with instant jump
- Calendar toolbar controls with Previous, Next, and Today quick-jump buttons
- Multi-language localization for calendar view toggle, jump-to-date, and navigation controls across all 7 supported languages (English, Danish, German, Spanish, French, Italian, Russian)
- Sub-category garment property with dynamic, pre-defined selection scoped to each category (e.g., T-shirt/Sweater for Tops, Shorts/Jeans/Trousers for Bottoms, Sneakers/Boots for Footwear)
- Expanded categories list with Headwear
- Database migrations for SQLite and PostgreSQL adding nullable columns for sub-category and new garment properties without data loss
- Multi-language localization support for sub-category, garment properties, and new category labels across all 7 supported languages (English, Danish, German, Spanish, French, Italian, Russian)
- Extended garment properties: Rating (1-5 stars), Seasons, Occasions, Cost, Purchase link, Look, Fit, and Print
- Filter modal and property sorting in wardrobe view with multi-tier priority tie-breaking (e.g. Category -> Sub-category -> Color -> Name, Rating -> Cost -> Name) and ascending/descending order controls
- Outfit rating (1-5 stars) support with interactive star selector on outfit builder/editor, and star displays on outfit cards, show view, and shared views
- Outfit garment picker modal with Filter Search and Sort By options, interactive filter panels (sub-category, color, size, season, occasion, rating), property sorting controls, active badge pills, live search, and slot clearing
- Paginated Outfits view displaying the most recent 50 outfits first with an asynchronous "Load More" button for fetching subsequent batches via HTMX
- Light and dark theme switcher with instant toggle, local storage persistence, and OS preference detection, accessible from both navbar and drawer
- Wears count (number of times worn in outfits) and dynamic Cost Per Wear displayed in garment details view
- Color swatch dots rendered beside color names in garment details view
- Configurable currency via `CURRENCY` environment variable with localized currency formatting
- Expanded color palette with 24 curated swatches and hex color dot previews

#### Fixed

- Use button element instead of anchor tag for drawer theme toggle to fix Lighthouse `crawlable-anchors` audit failure
- Fix SortableJS drag-and-drop initialization on outfit builder/editor rows by reordering script tags and adding resilient event listeners for direct visits and HTMX page transitions
- Outfit garments ordering: honor user custom drag-and-drop slot arrangement across outfit show, card, and share views, while retaining wear priority CATEGORY_SORT_ORDER by default
- Expand outfit row drag handle affordance to include category labels alongside the drag icon with grab cursor styling

## 0.6.0 2026-10-5

#### Added

- Weather on calendar page for aiding in outfit scheduling
- Danish language support

#### Fixed

- Bug in v0.4.0 migration that lost outfit_garments table data
- Missing closing div tag

## 0.5.1 - 2026-09-10

#### Added

- Add explicit save confirmation to garment upload flow
- Camera option for garment photo upload

#### Fixed

- Pre-select first garment in builder and fix Handlebars rendering

## 0.5.0 - 2026-06-26

#### Added

- Garment color combination support
- Garment washing details
- Garment acquisition date
- Garment archival
- Garment cloning

#### Fixed

- Visual bug on outfit builder

## 0.4.1 - 2026-06-15

#### Fixed

- Fix DISABLE_REGISTRATION logic

## 0.4.0 - 2026-06-13

#### Added

- Wardrobe sharing from one user to another with either view only or edit permissions

## [0.3.2] - 2026-06-09

#### Added

- Background removal toggle for garment photo uploads

## [0.3.1] - 2026-05-26

#### Changed

- Server HttpAdapter to Fastify, resulting in nearly a 2x throughput increase and almost half the latency.

## [0.3.0] - 2026-05-21

#### Added

- Garment image background touch up tool

## [0.2.5] - 2026-05-1

#### Added

- Option to disable register functionality

## [0.2.4] - 2026-04-28

#### Fixed

- Fix garment photo upload cropping

## [0.2.3] - 2026-04-20

#### Added

- Russian language support

## [0.2.2] - 2026-04-17

#### Changed

- Garment and Outfit names now optional

## [0.2.1] - 2026-04-15

#### Fixed

- fix empty outfit click area

## [0.2.0] - 2026-04-10

#### Added

- Clueless inspired outfit builder
- Outfit Scheduling
- Image background removal (Client-side and Server-side)
- Customizable categories

## [0.1.9] - 2026-03-19

#### Fixed

- Rely on http cache layer for images from the file endpoint rather than the service worker
- Extended login validity and added token fingerprint for invalidation on password change

#### Changed

- Change garments query to order by descending order to show new items at the top
- Adjusted garment list sizing on mobile

## [0.1.8] - 2026-03-13

#### Fixed

- Safe area inset for search bar
- S3 file service streaming object handling and config

#### Added

- French, German, and Spanish language support

## [0.1.7] - 2026-03-07

#### Added

- Italian language support

## [0.1.6] - 2026-03-06

#### Added

- Garment search and filter

## [0.1.5] - 2026-03-05

#### Fixed

- Added missing postgresql migration

## [0.1.4] - 2026-03-03

#### Fixed

- Fixed service worker update causing black screen

## [0.1.3] - 2026-03-03

#### Added

- Added garment "lingerie" category

## [0.1.2] - 2026-03-02

#### Fixed

- Fixed images rotate 90 degrees when uploaded

## [0.1.1] - 2026-02-26

### Fixed

- Bug fix for sharing outfits or wardrobes
- Validation to prevent user from submitting image before one is selected

### Changed

- Button label from "copy text" to "share" for clarity

## [0.1.0] - 2026-02-25

### Added

- MVP functionality
