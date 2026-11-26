# SmartQR launch decisions

- Brand: SmartQR; restaurant offering: SmartQR Menus. Existing Tablemint application and Stripe product names stay unchanged until a separately verified migration.
- Canonical origin: https://qr.cotiso.co.uk (DNS and TLS not yet verified).
- Global, English first; GBP monthly pricing: Free, Starter £9.99, Business £19.99, Agency £49.99. Tax and final limits must be configured before checkout. SmartQR plans are not purchasable yet.
- Independent managed OIDC: configure Auth0 or compatible provider with verified email/password, Google and Microsoft connections. No ChatGPT account required for the new workspace after provider activation. Existing restaurant accounts are not automatically linked by email.

## Configuration
1. Create a confidential web application at the identity provider. Enable the three requested connections, email verification and PKCE; configure token endpoint authentication as client_secret_post. Use an issuer whose authorization, token and userinfo endpoints share the issuer origin.
2. Set allowed callback to https://qr.cotiso.co.uk/api/smartqr/auth/callback. Set allowed logout/return URL to https://qr.cotiso.co.uk/smartqr. Local logout clears SmartQR session only, not the upstream SSO session.
3. Configure SMARTQR_PUBLIC_ORIGIN, SMARTQR_OIDC_ISSUER, SMARTQR_OIDC_CLIENT_ID, SMARTQR_OIDC_CLIENT_SECRET and a randomly generated SMARTQR_SESSION_SECRET (at least 32 random bytes, base64url encoded) as runtime settings; never commit secrets. Set SUPPORT_ADMIN_EMAIL to the verified operator email. Changing issuer or secret invalidates sessions; identity migration must be deliberate.
4. Configure DNS and TLS; apply migrations, run unit and build tests, test actual callback and logout, and test old restaurant URLs before publishing. Keep public anonymous scans reachable.
5. Operator-only dynamic beta remains in place until phishing reporting, abuse controls, independent billing, entitlements, session revocation and production security review are completed. No automatic migration of existing dynamic links or restaurant ownership.
