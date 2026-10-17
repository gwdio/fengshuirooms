# Decisions

Architecture Decision Records. One file per decision, numbered, never renumbered. To change a
decision, write a new ADR that supersedes the old one and update the old one's status line.

| #                                      | Decision                                             | Status   | Date                        |
| -------------------------------------- | ---------------------------------------------------- | -------- | --------------------------- |
| [0001](0001-aws-for-production.md)     | AWS (not Cloudflare) for production                  | Accepted | 2026-04                     |
| [0002](0002-no-3d.md)                  | No 3D in any version                                 | Accepted | 2026-04                     |
| [0003](0003-no-catalog-scraping.md)    | No furniture catalog scraping in MVP                 | Accepted | 2026-04                     |
| [0004](0004-url-hash-sharing-first.md) | URL-hash sharing in V1, backend in V2                | Accepted | 2026-04                     |
| [0005](0005-serverless-backend.md)     | Lambda + DynamoDB + API Gateway WS backend           | Accepted | 2026-04                     |
| [0006](0006-terraform-layout.md)       | Terraform with module layout, built only when needed | Accepted | 2026-04, amended 2026-10-17 |
| [0007](0007-frontend-stack.md)         | React + Zustand + Tailwind, npm-workspaces monorepo  | Accepted | 2026-10-17                  |
| [0008](0008-canonical-unit-inches.md)  | Store all lengths in inches                          | Accepted | 2026-10-17                  |
| [0009](0009-konva-for-canvas.md)       | Konva (react-konva) for the editor canvas            | Accepted | 2026-10-17                  |
| [0010](0010-walls-as-segments.md)      | Walls are independent straight segments              | Accepted | 2026-10-17                  |

Undecided items: [open-questions.md](open-questions.md). New ADRs: copy [template.md](template.md).
