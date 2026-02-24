# Market Viability Assessment — Libre Closet

_Research date: February 23, 2026_

---

## What This Project Is

Libre Closet is a **self-hosted, open-source (AGPLv3) closet/wardrobe management web app** built on a full-featured NestJS boilerplate (PWA, file uploads, auth, S3, Postgres/SQLite, i18n). The intended business model is a **cooperative revenue-share SaaS**: 10% to Lazztech LLC, 90% split among active contributors.

---

## The Market

The digital wardrobe organizer space is **real but niche**, sitting adjacent to the exploding secondhand fashion market (~$160B today, projected $367B by 2029 per ThredUp 2025 Resale Report).

### Market Size

| Segment                                                                     | Estimate                 |
| --------------------------------------------------------------------------- | ------------------------ |
| **TAM** (all adults who care about style + have smartphones)                | ~$1.5–2.4B/year globally |
| **SAM** (English-speaking, sustainability-conscious, 25–45, female-skewing) | ~$250–800M/year          |
| **SOM** (realistic 3-year capture for a new entrant)                        | $1–10M ARR               |

### Key Competitors

| App                    | Model                               | Notable Facts                                                  |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------- |
| **Stylebook**          | $3.99 one-time (iOS only)           | Oldest (2010), loyal audience, no subscription                 |
| **Cladwell**           | Freemium, ~$40/yr                   | Capsule wardrobe focus, bootstrapped                           |
| **Whering**            | Free + brand partnerships           | Raised ~£2M seed (UK-based), "millions" of users claimed       |
| **Indyx**              | Freemium + $60–150 stylist sessions | Best-in-class UX, angel-funded, launched ~2022                 |
| **OpenWardrobe**       | Free + "Lola AI" premium            | AI-first, Chrome extension, VC-backed startup                  |
| **Save Your Wardrobe** | B2B white-label for brands          | Raised $3M in 2021, pivoted away from consumer                 |
| **Koillection**        | MIT self-hosted, no monetization    | 1.1k GitHub stars — general collections, not wardrobe-specific |

### The Critical Gap

**There is no well-executed open-source, self-hostable wardrobe app with a polished cloud option.** The "Immich slot" (what Immich did for Google Photos) is entirely unclaimed in this category. GitHub's `wardrobe` topic has only ~33 repositories total, and none combine strong UX + self-hosting + a managed cloud tier.

---

## Viability Assessment

| Dimension                        | Rating                 | Notes                                                              |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| **Competition intensity**        | 🟢 Low–Medium          | No dominant player; most competitors are small or unfunded         |
| **Open-source niche**            | 🟢 Unclaimed           | The Immich/Bitwarden analogy slot is wide open                     |
| **Market size (SAM)**            | 🟡 ~$250–800M globally | Not VC-scale alone, but real                                       |
| **Willingness to pay**           | 🟡 ~$40–60/yr ceiling  | Comparable to Cladwell; not a hard sell                            |
| **Path to $1M ARR**              | 🟡 Achievable          | ~15,000–25,000 paying users required                               |
| **Path to $10M ARR**             | 🔴 Requires pivots     | Needs B2B, resale integration, or brand deals                      |
| **Sustainable fashion tailwind** | 🟢 Strong              | Core user motivation aligns perfectly with slow-fashion movement   |
| **VC-backable (alone)**          | 🔴 No                  | TAM too small for institutional VC; bootstrapped is the right path |

---

## Recommended Business Model

The **AGPLv3 open-core + hosted cloud** model (à la Bitwarden) is the most defensible strategy:

| Tier                   | What's Included                                                                 | Price         |
| ---------------------- | ------------------------------------------------------------------------------- | ------------- |
| **Self-host (free)**   | Full wardrobe management for Docker-capable users                               | $0            |
| **Cloud free tier**    | Hosted, up to ~200 garments, basic features                                     | $0            |
| **Cloud premium**      | Unlimited items, AI outfit suggestions, background removal, weather integration | ~$4–5/month   |
| **Stylist / B2B tier** | Multi-client wardrobe management, API access                                    | ~$20–50/month |

The **stylist/B2B tier is the highest-ARPU segment** and currently has no good tooling in the market.

### Revenue Model Projections

At 3% freemium conversion and $5/month ARPU:

| Free Users | Paying Users | MRR      | ARR      |
| ---------- | ------------ | -------- | -------- |
| 100,000    | 3,000        | $15,000  | $180,000 |
| 500,000    | 15,000       | $75,000  | $900,000 |
| 1,000,000  | 30,000       | $150,000 | $1.8M    |

---

## Competitive Differentiation Opportunities

| Gap                                  | Current State                                     | Opportunity                                     |
| ------------------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| **Privacy / no-ads guarantee**       | Most apps monetize via brand partnerships or data | AGPLv3 + self-host is a credible trust signal   |
| **Open data / export**               | Most apps lock users in; no standard format       | Open wardrobe data format; no vendor lock-in    |
| **Cross-platform web app**           | Stylebook is iOS-only; others are mobile-first    | Web PWA + mobile = broader reach                |
| **Developer API**                    | None of the small apps have public APIs           | API-first enables integrations and B2B          |
| **Self-hostable**                    | Zero polished options exist                       | The Immich slot in this market is wide open     |
| **Resale integration**               | No app connects wardrobe to Depop/Vinted listings | "List to sell" directly from the wardrobe app   |
| **Stylist B2B tier**                 | No dedicated tool for independent stylists        | Multi-client management at $20–50/mo            |
| **Capsule / sustainability framing** | Proven niche (Cladwell, Whering both use this)    | Aligns with slow-fashion community distribution |

---

## Key Risks

1. **Consumer motivation gap vs. passwords/photos** — wardrobe data doesn't feel as urgently "must-protect" as Bitwarden's use case, so the privacy angle is a softer sell
2. **Cataloging friction** — the biggest cause of user churn in this category is the upfront effort of photographing every garment; AI background removal and bulk import are near-mandatory features to compete
3. **"Free is the norm"** — OpenWardrobe and Whering are free, which compresses the pricing ceiling
4. **AI feature arms race** — OpenWardrobe is already pushing AI styling ("Lola AI"); AI suggestions will be an expectation, not a differentiator, within 1–2 years

---

## Distribution Strategy

The cooperative/bootstrapped model means growth must be organic and community-led:

- **r/selfhosted** and **r/homelab** — for the self-hosted open-source angle
- **r/capsulewardrobe**, **r/femalefashionadvice**, **r/malefashionadvice** — for consumer adoption
- **Slow fashion / sustainable fashion communities** — aligned values, high intent users
- **Independent stylist communities** — for the B2B tier
- **Product Hunt / Hacker News "Show HN"** — standard indie SaaS launch channels

---

## Bottom Line

> **Libre Closet is well-positioned for a bootstrapped/lifestyle business targeting the $1–3M ARR range.** The open-source self-hosted angle is a genuine white-space that no competitor currently occupies. A realistic 3-year ceiling is ~$3M ARR if the product is polished and the community grows. Scaling beyond that requires either a B2B stylist tier or plugging into the resale economy (e.g., one-click "list to Vinted/Depop" from your wardrobe). This is not a unicorn — but built well, it is a very viable indie SaaS and a first-mover in an unclaimed open-source niche.

---

## References

- ThredUp 2025 Resale Report
- BusinessofApps — Vinted, Depop statistics (2025)
- Bitwarden pricing and funding data
- GitHub `wardrobe` topic (~33 repos as of Feb 2026)
- Cladwell, Indyx, Whering, OpenWardrobe, Stylebook product pages
- RevenueCat / Adapty freemium conversion benchmarks
- AppMagic / data.ai mobile consumer spending reports (2025–2026)
