# 0003. No furniture catalog scraping in MVP

- **Status**: Accepted
- **Date**: 2026-04
- **Revisit**: after the core editor is stable

## Context

Scraping retailer catalogs (IKEA etc.) is tempting but has ToS risk, goes stale, and is a scope sink.

## Decision

Hand-curated generic catalog with standard dimensions. Adjustable rectangles/ovals cover anything missing.

## Consequences

Users type in exact dimensions for specific products. That's fine — it's one field.
