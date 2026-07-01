# Community Templates & Marketplace

Date: 1 July 2026

## Objective

Mindris needs a fluid community template workflow that stays compatible with:

- open-source distribution
- self-hosting
- local-first usage
- backend-owned template contracts
- renderer-side CSS safety

The first implementation must cover only `V1`.

Future versions are intentionally documented here so they are not forgotten, but they are out of scope for the first delivery.

## Decision

The exchange model for community templates is a portable template package.

Mindris should not start with:

- raw CSS copy/paste
- install-by-code only
- marketplace-coupled remote lookup as the primary installation path

Mindris should start with:

- import/export of a portable template package
- offline installation from file
- marketplace distribution of the same package artifact

## Recommended Model

Template distribution uses a dedicated package file, for example:

- `.mindris-template`

In practice, this can be a zip archive with a stable internal structure.

## Why this model

Compared to copy/paste CSS:

- safer
- validated
- versionable
- easier to support

Compared to install-by-code first:

- no forced network dependency
- better self-hosting story
- easier local testing
- cleaner contributor workflow

Compared to direct remote lookup first:

- less coupling between Mindris app and marketplace runtime
- easier moderation and package review
- simpler rollback path

## V1 Scope

V1 covers only package-based community templates.

### V1 user flows

- export a local template to a portable package
- import a package into Mindris
- preview installed community templates inside Mindris
- distribute the same package through a marketplace download flow
- reinstall the same template from file without manual editing

### V1 marketplace role

The marketplace acts as a catalogue and download surface.

It hosts:

- template metadata
- preview images
- downloadable template packages

The app installs from downloaded package files.

## Package Format

Recommended structure:

```text
my-template.mindris-template
├── manifest.json
├── template.json
├── styles.css
├── preview.png
└── README.md
```

Optional later:

- `screenshots/`
- `signature.json`

## File Responsibilities

### `manifest.json`

Carries package identity and compatibility metadata:

- `id`
- `name`
- `version`
- `author`
- `license`
- `description`
- `category`
- `tags`
- `engine_version`

### `template.json`

Carries renderer-safe template configuration:

- preset settings
- supported sections
- palette
- typography defaults
- layout defaults
- optional community metadata used in UI

### `styles.css`

Carries custom renderer-side styling for the template.

This file is never trusted client-side. It is validated and sanitized by Mindris renderer rules.

### `preview.png`

Required static preview for library and marketplace display.

### `README.md`

Optional human documentation:

- author notes
- intended use
- accessibility notes
- contribution credits

## Guardrails

These guardrails should be part of the first design, even if some are enforced incrementally.

### Package validation

- manifest is required
- template config is required
- preview is required
- missing required files reject import

### Compatibility

- `engine_version` must be validated
- unsupported package versions are rejected with explicit errors
- partial fallback behavior must not silently corrupt installed templates

### CSS safety

- CSS is sanitized renderer-side only
- no direct execution of community CSS in frontend logic
- unsupported or dangerous constructs are rejected or stripped

### Identity

- template ids should be namespaced
- recommended format: `author_slug/template_slug`
- collisions must be rejected or explicitly versioned

### Licensing

- license field is mandatory
- missing or invalid license blocks import

### Preview quality

- preview image is mandatory for marketplace and in-app browsing
- package should not be considered publishable without preview

### Contribution safety

- imported packages remain data artifacts, not executable plugins
- no arbitrary JS in template packages
- no remote dependency fetch during import

### Product integrity

- frontend remains a client only
- install/import/export decisions stay API/backend-owned
- renderer remains the final execution boundary for style application

## Deferred Versions

These are intentionally not part of V1.

### V1.1

- marketplace template pages with richer metadata
- first-class download flow from marketplace UI
- improved author profiles and discovery

### V1.2

- install from URL
- direct package fetch from a marketplace endpoint
- more guided in-app install flow

### Later

- install by template id or code
- signature verification
- trust levels / moderation states
- update notifications for installed community templates
- one-click sync with a hosted registry

## Recommendation for Run 13

Run 13 should implement only:

- package manifest contract
- import/export path
- preview handling
- contribution flow basics
- QA hardening for E2E and multilingual regressions

It should not implement:

- remote install by code
- remote fetch by id
- marketplace auth system
- advanced moderation platform

