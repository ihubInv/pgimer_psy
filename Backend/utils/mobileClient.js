/**
 * Detect native / Flutter clients so login & session can return JWTs in JSON
 * instead of relying on browser cookies only.
 *
 * Flutter should send at least one of:
 *   X-Client-Type: mobile | flutter
 *   X-Platform: flutter | android | ios
 *   X-App-Version: <any non-empty string>
 * Or a User-Agent containing "dart" / "flutter" (last resort).
 */
const isMobileAppClient = (req) => {
  if (!req) return false;

  const headers = req.headers || {};
  const body = req.body || {};
  const query = req.query || {};

  const clientTypeHeader = String(headers['x-client-type'] || '').trim().toLowerCase();
  const platformHeader = String(headers['x-platform'] || '').trim().toLowerCase();
  const appVersionHeader = headers['x-app-version'];
  const userAgent = String(headers['user-agent'] || '').toLowerCase();

  // Fallbacks for clients that cannot set custom headers reliably.
  const clientTypeBody = String(body.clientType || body.client_type || body.deviceType || '').trim().toLowerCase();
  const platformBody = String(body.platform || '').trim().toLowerCase();
  const appVersionBody = body.appVersion || body.app_version;
  const clientTypeQuery = String(query.clientType || query.client_type || '').trim().toLowerCase();
  const platformQuery = String(query.platform || '').trim().toLowerCase();
  const appVersionQuery = query.appVersion || query.app_version;

  const clientType = clientTypeHeader || clientTypeBody || clientTypeQuery;
  const platform = platformHeader || platformBody || platformQuery;
  const appVersionRaw = appVersionHeader ?? appVersionBody ?? appVersionQuery;

  const isFlutterUserAgent = userAgent.includes('dart') || userAgent.includes('flutter');

  const hasAppVersion =
    appVersionRaw !== undefined &&
    appVersionRaw !== null &&
    String(appVersionRaw).trim() !== '';

  if (clientType === 'mobile' || clientType === 'flutter') return true;
  if (['flutter', 'android', 'ios'].includes(platform)) return true;
  if (hasAppVersion) return true;
  if (isFlutterUserAgent) return true;

  return false;
};

/** Refresh token: HttpOnly cookie (web) or JSON body (mobile), same string format. */
const getRefreshTokenFromRequest = (req) => {
  const fromCookie = req.cookies?.refreshToken;
  if (fromCookie && String(fromCookie).trim()) return String(fromCookie).trim();
  const fromBody = req.body?.refreshToken;
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim();
  return null;
};

module.exports = {
  isMobileAppClient,
  getRefreshTokenFromRequest,
};
