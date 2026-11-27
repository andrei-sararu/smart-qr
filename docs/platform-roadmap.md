# Cotiso QR platform

## Current system

Cloudflare Workers runs Vinext routes, D1 stores accounts and hospitality data, and R2 stores uploaded images. The hospitality module already provides persistent menu and table links, SVG QR export, menus and product options, table orders and bills, staff invitations, and service metrics. Stripe subscriptions and email recovery are configuration-dependent. Existing customer links depend on the root page and its menu hash route.

Reuse Worker authentication, D1, and the QR encoder. Keep hospitality tables and URLs intact. The old README describes an earlier release and is unreliable as an inventory. Hospitality ownership is keyed to one account and supports separate service-board access only. It cannot serve as general organisation RBAC. D1 schema creation dispersed across request handlers needs a dedicated migration and production rollout process. Platform routes must scope every private query, validate every stored destination on write and use, and retain destination changes for incident review.

## Commercial priorities

Lead with equipment and property issue reporting. Demonstrate a location or reference attached to every submission, continuity after reprinting is impractical, and funnel metrics that show what visitors actually did. Hospitality remains a separate vertical in the navigation. Retail, field service and marketing can use the same profile and form path with different content. Validate each vertical with real customers before creating separate products.

| Phase | Outcome | Scope |
| --- | --- | --- |
| First release | Print a code, edit its experience, receive a report and measure completion | One owner workspace per account, static HTTPS QR, dynamic QR, multi-action profiles, report forms and inbox, status controls, history, PNG/SVG and basic events |
| MVP completion | Operate a portfolio of touchpoints | Explicit organisation, workspace, membership, asset and location records, typed custom fields, reusable forms, projects, tags, custom slugs, templates, expiry and scheduled destinations, bulk operations, revisions and rollback, retention and exports |
| Phase 2 | Route outcomes to customer systems | Versioned REST API, scoped hashed and rotatable API keys, test workspace, signed webhook outbox with retry and dead-letter handling, verified custom domains, conditional rules, expanded funnels and privacy-reviewed device and regional aggregates |
| Enterprise | Control changes across distributed teams | Admin, Manager, Editor and Viewer roles, protected changes with reauthentication/approval, 2FA, SSO via OIDC/SAML, audit export, deletion and retention controls, alerting, SLAs, white labelling and named CRM integrations |

First release stores profiles, events, reports and revisions with owner scope. A profile owns its immutable scan identity for this release. Separate QR, asset and action entities as the product adds multiple codes per profile, reusable workflows and team memberships. Generic public actions are tracked by POST; an external link click measures intent, while only a durably stored report counts as a workflow completion. A scan is an HTTP visit, not proof of a physical scan or a unique person. Do not collect precise location or fingerprint visitors.

Use outbound integrations only through a queue with authenticated, bounded delivery, redirect restrictions, destination validation, encrypted secrets and secret rotation. Never put credentials or non-public documents into unauthenticated scan pages. Require verified domain ownership before custom domains, and version public destination changes with tenant scope and incident history.

## Portfolio controls

Codes can be grouped by a project name and tagged. These labels are scoped to the signed-in owner and searchable in the workspace. Cloning opens an editable copy with a new scan identity on save. Dynamic copies default to paused, and an expiry is never copied. The workspace exports code definitions in JSON, without reports or scan records.

Project, tag and UTC expiry settings are stored separately and committed with code changes and revision history. Existing records need no backfill. Server-side expiry applies to profile views, actions and form submissions, and to dynamic redirects. Removing expiry restores the same printed link when the code is active. Static links are fixed and independently scannable.

## Proposed platform tiers

Free covers static codes and limited dynamic QR. Pro adds branding, profiles and forms. Business adds assets, teams, workflows, API, webhooks and domains. Enterprise adds identity, governance, retention and SLAs. These are packaging hypotheses. Existing hospitality plans stay independent and unshipped platform entitlements should not appear as purchasable functionality.
