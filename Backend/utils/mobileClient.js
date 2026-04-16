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
  if (!req || !req.headers) return false;

  const clientType = String(req.headers['x-client-type'] || '').trim().toLowerCase();
  const platform = String(req.headers['x-platform'] || '').trim().toLowerCase();
  const appVersionRaw = req.headers['x-app-version'];
  const userAgent = String(req.headers['user-agent'] || '').toLowerCase();

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
