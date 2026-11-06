# RKJ CRM — Angular application

The `app/` directory contains the browser application for the RK Jewellers CRM. It is an Angular 19 standalone-component application for customer follow-up, product catalogue browsing, sales, orders, staff administration, video sharing, and CRM Catalog Desk workflows.

This README describes the frontend in this directory. The API server and other workspace projects are siblings of `app/` and are not installed or started by the commands below.

## Contents

- [Technology](#technology)
- [Getting started](#getting-started)
- [Development, build, and tests](#development-build-and-tests)
- [Application architecture](#application-architecture)
- [Routes](#routes)
- [Project structure](#project-structure)
- [Configuration and integrations](#configuration-and-integrations)
- [CRM Catalog Desk](#crm-catalog-desk)

## Technology

- Angular 19, TypeScript, RxJS, and Zone.js
- Standalone components and Angular Router
- PrimeNG 19, PrimeNG Aura theme, and PrimeIcons
- Tailwind CSS 4 (loaded from `src/styles.css`)
- Jasmine and Karma for unit tests
- jsPDF and `jspdf-autotable` for product/order document generation
- `ngx-scanner-qrcode` and QR-code packages for scanning and code generation
- Angular service worker for production builds

Package versions and npm scripts are maintained in [`package.json`](./package.json); the resolved dependency tree is recorded in [`package-lock.json`](./package-lock.json).

## Getting started

### Prerequisites

- Node.js and npm versions supported by the installed Angular CLI 19 toolchain
- The CRM API running at the configured API URL for authenticated and data-backed screens

### Install dependencies

Run these commands from the `app/` directory:

```bash
npm ci
```

### Start the development server

```bash
npm start
```

This runs `ng serve` with the development configuration. The default local frontend URL is `http://localhost:4200/`. If that port is already in use, Angular CLI may ask to use another port or exit with a port-in-use error.

The development environment points to the local API at `http://localhost:5200`. The development serve configuration also enables [`proxy.conf.json`](./proxy.conf.json), which proxies `/api` requests to that API.

## Development, build, and tests

Run commands from `app/`:

| Command                                    | Purpose                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| `npm start`                                | Start the Angular development server                          |
| `npm run build`                            | Create the default production build                           |
| `npm run watch`                            | Rebuild continuously with the development build configuration |
| `npm test`                                 | Run the Angular Karma/Jasmine test target                     |
| `npx ng test --watch=false`                | Run tests once, without Karma watch mode                      |
| `npx ng build --configuration development` | Build using local development configuration                   |

The production build output is configured as `../backend/public/dist`, not `app/dist`. See the `outputPath` in [`angular.json`](./angular.json). The development configuration disables optimization and uses source maps. Production builds enable output hashing and the Angular service worker.

Most feature components and shared services have a sibling `*.spec.ts` test file. The test target is configured in `angular.json` and uses [`tsconfig.spec.json`](./tsconfig.spec.json). No end-to-end test target is configured in this project.

## Application architecture

### Bootstrap and global providers

1. [`src/main.ts`](./src/main.ts) bootstraps the standalone `AppComponent`.
2. [`src/app/app.config.ts`](./src/app/app.config.ts) registers the router, HTTP client/interceptors, asynchronous animations, PrimeNG Aura theme, and production service worker.
3. [`src/app/app.routes.ts`](./src/app/app.routes.ts) defines public routes and authenticated application routes.
4. The root component hosts the router outlet and global notifications.

### Pages and layout

Screens are organized by feature under `src/app/pages/`. Most are standalone Angular components, with a TypeScript class, HTML template, optional component stylesheet, and a Jasmine spec. The admin component provides the authenticated application shell and its child navigation.

### Shared code

- **Services** encapsulate API access, authentication, loading state, product/catalogue desk state, reports, orders, image search, scanning, targets, saved items, and video sharing.
- **Guards** enforce authentication and selected role restrictions.
- **Interceptors** attach API/auth behavior and manage global request loading.
- **Models** hold shared chat, CRM desk, reporting, and target types.
- **Pipes** contain shared display transformations (including safe Markdown rendering).

### Backend communication

`ApiService` centralizes most REST calls. Feature-specific services are used for larger domains such as orders, image search, scanner, targets, and CRM Desk state. The API URL is selected through Angular environment file replacement; keep API endpoints and credentials out of page components.

## Routes

The initial route redirects to `/login`. Authenticated screens are nested under the admin application shell and protected by `authGuard`.

| Route                                                 | Screen                                 |
| ----------------------------------------------------- | -------------------------------------- |
| `/login`                                              | Sign-in                                |
| `/overview`                                           | CRM overview                           |
| `/customers/view-all`                                 | Customer list                          |
| `/customers/add-new`                                  | Create a customer                      |
| `/view-customer/:id`                                  | Customer record and activity           |
| `/search/:customer_name`                              | Customer search                        |
| `/followup/todays`                                    | Today’s follow-ups                     |
| `/followup/missed`                                    | Missed follow-ups                      |
| `/products/view-all`                                  | Product catalogue and CRM Catalog Desk |
| `/view-details/:jewel_code`                           | Product details                        |
| `/products/compare`                                   | Product comparison                     |
| `/image-search`                                       | Image-based product search             |
| `/sold-items/sold-entry`                              | Record a sale                          |
| `/sold-items/sold-items`                              | Sold-item list                         |
| `/view-sold-items/:id`                                | Sold-item details                      |
| `/orders/order-dashboard`                             | Order dashboard                        |
| `/orders/new-order`                                   | Create an order                        |
| `/orders/all-orders` and `/orders/all-orders/:status` | Order lists                            |
| `/orders/order-detail/:id`                            | Order details                          |
| `/orders/edit-order/:id`                              | Edit an order                          |
| `/orders/change-status`                               | Change order status                    |
| `/orders/order-report`                                | Order reporting                        |
| `/videos/view-all`                                    | Video library                          |
| `/videos/shared-links`                                | Shared video links                     |
| `/feedback`                                           | Public feedback form                   |
| `/myplaylist/:token`                                  | Token-based shared playlist            |
| `/all-users`                                          | Staff administration (admin role)      |
| `/karigar/karigar-dashboard`                          | Karigar dashboard (karigar role)       |
| `/change-password`                                    | Change password                        |
| `/manage-targets`                                     | Manage sales targets                   |

Unknown routes redirect to `/login`. Some role-related restrictions are enforced by `rolecheckGuard`; inspect the route’s `data.expectedRole` and the guard before changing access behavior.

## Project structure

```text
app/
├── .editorconfig
├── .gitignore
├── .vscode/
│   ├── extensions.json
│   ├── launch.json
│   └── tasks.json
├── public/
│   ├── category-img/             # Category artwork for catalogue screens
│   ├── icons/                    # PWA icon sizes
│   └── ...                       # Logos, product/search artwork, and fallback images
├── src/
│   ├── app/
│   │   ├── app.component.*       # Root host and global shell
│   │   ├── app.config.ts         # Global providers and integrations
│   │   ├── app.routes.ts         # Route table
│   │   ├── guard/
│   │   │   ├── auth.guard.ts
│   │   │   └── rolecheck.guard.ts
│   │   ├── interceptor/
│   │   │   ├── apicall.interceptor.ts
│   │   │   └── loading.interceptor.ts
│   │   ├── models/
│   │   │   ├── Feedback.model.js
│   │   │   ├── chat.model.ts
│   │   │   ├── desk.models.ts
│   │   │   ├── report.model.ts
│   │   │   └── target.model.ts
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── change-password/
│   │   │   ├── chat-widget/
│   │   │   ├── customers/
│   │   │   │   ├── add-new/
│   │   │   │   ├── customer-view-all/
│   │   │   │   ├── missed/
│   │   │   │   ├── today/
│   │   │   │   └── view-customer/
│   │   │   ├── feedback/         # Feedback form and country list
│   │   │   ├── footfall-sheet/
│   │   │   ├── image-search/
│   │   │   ├── karigar/
│   │   │   │   └── karigar-dashboard/
│   │   │   ├── login/
│   │   │   ├── manage-target/
│   │   │   ├── mobile-footer/
│   │   │   ├── not-found/
│   │   │   ├── orders/
│   │   │   │   ├── all-orders/
│   │   │   │   ├── change-status/
│   │   │   │   ├── edit-order/
│   │   │   │   ├── new-order/
│   │   │   │   ├── order-dashboard/
│   │   │   │   ├── order-detail/
│   │   │   │   └── order-report/
│   │   │   ├── overview/
│   │   │   ├── products/
│   │   │   │   ├── compare/
│   │   │   │   ├── products-view-all/
│   │   │   │   │   └── qr-scanner/
│   │   │   │   └── view-details/
│   │   │   ├── search/
│   │   │   ├── settings/
│   │   │   ├── solds/
│   │   │   │   ├── sold-entry/
│   │   │   │   ├── sold-items/
│   │   │   │   └── view-sold-items/
│   │   │   ├── target-view/
│   │   │   ├── users/
│   │   │   │   ├── add-new-user/
│   │   │   │   └── all-users/
│   │   │   ├── videos/
│   │   │   │   ├── link-status/
│   │   │   │   ├── myplaylist/
│   │   │   │   ├── shared-links/
│   │   │   │   ├── upload-new-video/
│   │   │   │   └── view-all/
│   │   │   └── viewfootfalldetail/
│   │   ├── pipes/
│   │   │   └── safe-markdown.pipe.ts
│   │   └── services/
│   │       ├── api.service.ts
│   │       ├── auth.service.ts
│   │       ├── chat-service.service.ts
│   │       ├── desk-state.service.ts
│   │       ├── loader.service.ts
│   │       ├── logined-user.service.ts
│   │       ├── report.service.ts
│   │       ├── saveitems.service.ts
│   │       ├── sharevideos.service.ts
│   │       ├── Feedback.service.ts
│   │       ├── imagesearch/
│   │       │   └── image-search.service.ts
│   │       ├── orders/
│   │       │   ├── order-services.ts
│   │       │   └── share-order.service.ts
│   │       ├── scanner/
│   │       │   └── scanner.service.ts
│   │       └── target/
│   │           └── target.service.ts
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.development.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── angular.json
├── ngsw-config.json
├── package.json
├── package-lock.json
├── proxy.conf.json
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json
```

Feature directories generally contain the matching component `.ts`, `.html`, and `*.spec.ts`; stylesheets are present only where a feature has component-specific styling. The listing groups repetitive test and template files to keep the tree readable.

### Feature directory guide

| Directory                                                        | Responsibility                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pages/customers/`                                               | Customer creation, customer lists/details, and follow-up lists           |
| `pages/products/`                                                | Catalogue, CRM Catalog Desk, product comparison/details, and QR scanning |
| `pages/orders/`                                                  | Order creation, updates, status, dashboards, details, and reports        |
| `pages/solds/`                                                   | Sold-item entry, list, and detail screens                                |
| `pages/videos/`                                                  | Video library, uploads, shared links, status, and playlists              |
| `pages/users/`                                                   | Staff creation and administration                                        |
| `pages/karigar/`                                                 | Karigar dashboard                                                        |
| `services/orders/`                                               | Order API and order sharing                                              |
| `services/imagesearch/`, `services/scanner/`, `services/target/` | Feature-specific data and device integrations                            |

## Configuration and integrations

### Environment files

- [`src/environments/environment.development.ts`](./src/environments/environment.development.ts) configures the local API and app URLs for development.
- [`src/environments/environment.ts`](./src/environments/environment.ts) configures the default/production API and image-service URLs.
- `angular.json` replaces the default environment with the development file for development builds.

Change URLs in the appropriate environment file when connecting to another API or image service. Do not commit credentials, private tokens, or other secrets in environment files; use the backend or deployment secret management for those values.

### HTTP and authentication

- `ApiService` groups the main customer, product, order-adjacent, user, sold-item, and chat API calls.
- `AuthService` handles the login token and exposes the current user name, role, and ID.
- `authGuard` protects authenticated routes. `rolecheckGuard` restricts role-specific screens.
- HTTP interceptors provide shared request behavior; review them before changing headers, authorization, or loading indicators.

### Styling and static assets

Global CSS imports Tailwind and PrimeIcons in `src/styles.css`. PrimeNG theme configuration lives in `src/app/app.config.ts`. Files in `public/` are served as static assets; catalogue category artwork is in `public/category-img/`, and PWA icons are in `public/icons/`.

## CRM Catalog Desk

The desk is hosted by `/products/view-all`, alongside the existing product catalogue. It combines enquiry tracking with catalogue search, filters, a shortlist, and customer message templates.

- [`src/app/models/desk.models.ts`](./src/app/models/desk.models.ts) defines enquiry, market, stage, template, filter, and pricing-rule types/defaults.
- [`src/app/services/desk-state.service.ts`](./src/app/services/desk-state.service.ts) provides local-first enquiry state, pending-send logging, sync status, and market rules. It persists changes locally and synchronizes with the `/api/desk` API, retrying unsynced work when connectivity returns.
- [`src/app/pages/products/products-view-all/`](./src/app/pages/products/products-view-all/) contains the screen, styling, and QR scanner.

Market multipliers in the model are fallback values; management-editable pricing depends on the desk market-rules API. Review the current backend integration and data mappings before changing how prices are presented to customers.
