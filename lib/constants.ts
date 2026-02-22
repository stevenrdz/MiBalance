export const APP_NAME = "MiBalance EC";
export const COMPANY_NAME = "PangoTech";
export const APP_CURRENCY = "USD";
export const APP_LOCALE = "es-EC";
export const APP_TIMEZONE = "America/Guayaquil";

export const PAGINATION_SIZE = 10;
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf"
] as const;

export const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot",
  "/auth/reset"
] as const;

