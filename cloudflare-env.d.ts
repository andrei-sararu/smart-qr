declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SMARTQR_PUBLIC_ORIGIN?: string;
    SMARTQR_SUPERADMIN_ID?: string;
    SMARTQR_OIDC_ISSUER?: string;
    SMARTQR_OIDC_CLIENT_ID?: string;
    SMARTQR_OIDC_CLIENT_SECRET?: string;
    SMARTQR_SESSION_SECRET?: string;
  }
}
