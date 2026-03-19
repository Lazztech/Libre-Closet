# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

- ...

## [0.1.9]

#### Fixed

- Rely on http cache layer for images from the file endpoint rather than the service worker
- Extended login validity and added token fingerprint for invalidation on password change

#### Changed

- Change garments query to order by descending order to show new items at the top
- Adjusted garment list sizing on mobile

## [0.1.8]

#### Fixed

- Safe area inset for search bar
- S3 file service streaming object handling and config

#### Added

- French, German, and Spanish language support

## [0.1.7]

#### Added

- Italian language support

## [0.1.6]

#### Added

- Garment search and filter

## [0.1.5]

#### Fixed

- Added missing postgresql migration

## [0.1.4]

#### Fixed

- Fixed service worker update causing black screen

## [0.1.3]

#### Added

- Added garment "lingerie" category

## [0.1.2]

#### Fixed

- Fixed images rotate 90 degrees when uploaded

## [0.1.1]

### Fixed

- Bug fix for sharing outfits or wardrobes
- Validation to prevent user from submitting image before one is selected

### Changed

- Button label from "copy text" to "share" for clarity

## [0.1.0]

### Added

- MVP functionality
