# Vision & scope

## Problem

Existing room planners are either too heavyweight (steep learning curves, 3D, accounts, paywalls) or
too primitive (Google Slides, graph paper). There is no good "I just moved into a new place and want
to plan where my furniture goes" tool. The target user has a floorplan PDF and wants to know if their
stuff fits and roughly where to put it.

## Target user

- Moving into a new apartment / studio / dorm / single room
- Has a floorplan or rough measurements
- Doesn't want to learn interior design or 3D modeling
- Wants a fast, free, no-account experience

## Core promise

**"Plan your space in 5 minutes, no signup, on any device."**

Every feature should be checked against this. If it makes the first 5 minutes slower or adds a
signup wall, it's probably wrong.

## Non-goals

- Not a professional design tool (no CAD-grade precision, no construction docs)
- Not a 3D walkthrough tool ([ADR-0002](../decisions/0002-no-3d.md))
- Not a marketplace or e-commerce platform
- Not a multi-floor / whole-building tool
- Not a replacement for a real interior designer

Also explicitly out: window-light calculation, hard collision detection (visual overlap highlighting
is enough), auto-layout / AI suggestions, native mobile apps (web, mobile-responsive only).

## Differentiators

- **Tight scope** — does one thing, fast, free
- **Floorplan image import + trace** — most casual tools fail here or paywall it
- **Visibility / "feng shui ninja" view** — a fun, opt-in 2D shadow-cast view that flags exposed
  positions; practical-with-a-wink, not mystical ([visibility.md](visibility.md))
- **No-account experience** — share via URL, save locally
- **Real-time collab** — plan with a roommate or partner

## Monetization

At most a "buy me a coffee" link. The AWS deployment and real-time collab are built primarily for
portfolio value; that's a legitimate goal but it must never make the product worse for the user.
