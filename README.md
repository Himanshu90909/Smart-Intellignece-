# Smart Intelligence

Smart Intelligence is a React + TypeScript product-discovery application built around a real, deterministic in-browser search engine. It combines TF-IDF indexing and cosine similarity with natural-language filter parsing, explainable recommendations, product comparison, cart/wishlist persistence, and an optional live Amazon-data integration.

The project is intentionally honest about its boundaries: the bundled catalog is static, the local search engine is not a generative model, and the live Amazon route requires a server-side `RAPIDAPI_KEY`.

## What is implemented

- Natural-language product search such as `white running shoes under ₹3000`.
- URL-synchronized category, brand, price, rating, discount, color, material, availability, sort, and pagination state.
- Deterministic TF-IDF + cosine search with a graceful facet-relaxation path when exact catalog facets have no matches.
- Recommendation rails whose reasons are derived from product attributes rather than invented metrics.
- Product details, quick view, compare up to four products, AI comparison verdicts, wishlist, recently viewed items, and optimistic cart updates.
- Responsive navigation and mobile filter drawer with semantic controls and keyboard-friendly modal/drawer behavior.
- Lazy-loaded route chunks for Catalog, Product, Compare, Live, and Engineering pages.
- Optional live Amazon search/details through `/api/amazonLive`; the RapidAPI key remains server-side.
- Engineering page with measurements taken in the current browser session: vector build, search/filter timings, Web Vitals when available, navigation timing, and downloaded resource sizes.

## Frontend Engineering Architecture

The application is layered so that UI, business logic, persistence, and external data boundaries remain independently replaceable.

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Routes/pages | Compose user journeys and route-level loading | `src/pages`, `src/App.tsx` |
| Reusable UI | Cards, drawers, modals, empty/error/loading states | `src/components` |
| Domain logic | Search, parsing, filters, recommendations, verdicts | `src/lib` |
| State | Small shared client state persisted to localStorage | `src/store` |
| Data boundary | Typed live-data client and server-side proxy | `src/lib/amazon.ts`, `functions/amazonLive.js` |
| Static data | Bundled product catalog and derived facets | `src/data` |

### Routing strategy

React Router provides client-side navigation without full page reloads. Internal links use `Link`/`NavLink`; route-level `lazy` imports keep feature chunks out of the initial bundle. Vercel rewrites apply only to non-API paths so `/api/amazonLive` is not swallowed by the SPA fallback.

### State management

Local React state handles page-local form and loading state. A small Context layer handles cart, wishlist, comparison, recents, and search history because those slices are shared across routes and need persistence. Redux or another state library would add dependency and API surface without solving a current problem.

### API architecture

The browser talks only to the same-origin `/api/amazonLive` route by default. `src/lib/amazon.ts` centralizes query construction, response parsing, timeout handling, and user-safe errors. The proxy validates the request mode, keeps `RAPIDAPI_KEY` on the server, bounds upstream request time, normalizes payloads, and does not expose upstream error bodies or stack traces. A custom `VITE_AMAZON_API` can be supplied for a separately hosted compatible proxy; it must not contain secrets.

### Reusable component library

Shared primitives include lazy images with fallback, skeleton cards, empty state, error state, modal, drawer, product cards, filter controls, toolbar, pagination, and navigation components. Components use semantic HTML, visible focus styling, labels, roles where needed, and explicit retry/reset actions.

### Accessibility and responsive design

The UI uses heading hierarchy, labelled form controls, keyboard-operable buttons and links, focus-visible outlines, `aria-live`/alert states where appropriate, and focus-managed overlays. The layout uses responsive grids and a mobile filter drawer rather than relying on desktop-only sidebars. Images have meaningful alt text and fixed aspect-ratio containers to reduce layout movement.

### Performance decisions

Route-level code splitting, lazy image loading, bounded pagination, debounced search suggestions, and a single memoized vector index keep work proportional to the current interaction. The catalog is only a few hundred records, so pagination is simpler and more maintainable than virtualization. The Engineering page reports runtime measurements instead of publishing unverified performance claims.

## Technology Tradeoffs

React was selected because the app benefits from composable components, predictable state boundaries, and a mature testing ecosystem. Its tradeoffs are additional client-side JavaScript and the need to manage effect/lifecycle boundaries carefully; route splitting and focused Context usage address those costs.

jQuery is not used in React-controlled UI. Direct DOM manipulation would compete with React's rendering model and create two sources of truth. jQuery can still be reasonable in a legacy page or a plugin ecosystem that owns its DOM, but it would not add value here.

Third-party libraries are kept deliberately small: React Router provides routing, Vitest and Testing Library provide tests, and Playwright covers browser flows. Each dependency adds bundle, maintenance, and upgrade cost, so no UI framework, Redux store, chart library, or artificial keyword dependency was added without a current product need.

## Testing

```bash
npm install
npm test
npm run build
npm run test:e2e
```

Unit tests cover vector ranking, filters, pagination, formatting, recommendations, and comparison verdict logic. Playwright covers catalog search/filtering, product-to-cart flow, comparison, and natural-language interpretation. The E2E config starts Vite preview; run `npm run build` before `npm run test:e2e` when executing it directly.

## Local development

```bash
npm install
npm run dev
```

The local catalog and all core shopping features work without external credentials. To enable live Amazon data, configure `RAPIDAPI_KEY` as a server-side Vercel environment variable. Do not put it in a `VITE_*` variable. The frontend can point to another compatible proxy with `VITE_AMAZON_API`, but the default is the same-origin `/api/amazonLive` route.

## Deployment

The project is Vercel-ready:

1. Import the repository into Vercel.
2. Use the standard Vite build command (`npm run build`) and output directory (`dist`).
3. Add `RAPIDAPI_KEY` only if live Amazon data is required.
4. Deploy and verify `/`, `/catalog`, `/compare`, `/live`, and `/engineering`.
5. Confirm that the live route returns a user-safe configuration error when the secret is intentionally absent, rather than a stack trace.

## Amazon Front-End Engineer Internship Skill Mapping

| Requirement | Evidence in this project |
| --- | --- |
| JavaScript / TypeScript | React application logic, typed domain models, deterministic search algorithms |
| HTML / CSS | Semantic controls, responsive CSS design system, accessible overlays and forms |
| React | Component architecture, Context, hooks, route-level lazy loading |
| Reusable UX components | Product cards, primitives, drawers, modals, filter controls, pagination, feedback states |
| REST API integration | Centralized Amazon client, timeout/error handling, server-side proxy |
| UX patterns | Loading, error, empty, retry, reset, search, filter, sort, pagination, compare, cart feedback |
| Scalable frontend | Separate pages/components/lib/store/data layers and typed boundaries |
| Testing | Vitest unit tests and React Testing Library dependencies |
| Automated browser testing | Playwright critical user flows |
| Library evaluation | Documented React, jQuery, state, and dependency tradeoffs |
| Operational excellence | Build validation, safe errors, secret boundary, SPA/API routing separation |
| CS fundamentals | TF-IDF indexing, cosine similarity, filtering, pagination, deterministic ranking |

This mapping describes implemented evidence; it is not a claim of guaranteed job matching or interview selection.

## Known limitations

The bundled product catalog is static and client-side. Cross-device accounts, server-backed cart synchronization, authentication, and a persistent analysis history are not implemented. Live Amazon results depend on a third-party API, its quota, and a configured server-side key. The app does not claim a generative AI model for local search; its explainability comes from transparent ranking and product attributes.

## License

MIT
