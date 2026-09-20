const variants = ['development', 'preview', 'production'];
const previewPackage = 'com.etklam.diaryapp.preview';

function hostedOrigin(value) {
  if (typeof value !== 'string' || !/^https:\/\/[^\s/\\?#]+\/?$/.test(value)) throw new Error('A hosted HTTPS origin is required.');
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || !host.includes('.') || host.includes(':') || /^[\d.]+$/.test(host)
    || /(^|\.)(localhost|local|internal|test|invalid|example)(\.|$)/.test(host)
    || /(^|\.)(example\.(com|org|net)|localtest\.me|nip\.io|sslip\.io)$/.test(host)
    || /placeholder|your[-.]|change[-]?me|10\.0\.2\.2/.test(host)) throw new Error('Use an approved public HTTPS origin, without credentials, path, query or fragment.');
  return url.origin;
}
function supportDestination(value) {
  if (typeof value !== 'string' || !value || value !== value.trim() || /[\r\n\\]/.test(value)) throw new Error('EXPO_PUBLIC_BETA_SUPPORT_URL is required.');
  if (value.startsWith('mailto:')) {
    if (!/^mailto:[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) throw new Error('Support email must contain one address and no parameters.');
    hostedOrigin(`https://${value.split('@')[1]}`); return value;
  }
  const url = new URL(value);
  hostedOrigin(url.origin);
  if (url.username || url.password || url.search || url.hash) throw new Error('Support URL must not contain credentials or parameters.');
  return url.href;
}
function validateRelease(env) {
  const variant = env.APP_VARIANT;
  if (!['preview', 'production'].includes(variant) || env.EXPO_PUBLIC_APP_ENV !== variant) throw new Error('APP_VARIANT and EXPO_PUBLIC_APP_ENV must match preview or production.');
  const apiOrigin = hostedOrigin(env.EXPO_PUBLIC_API_BASE_URL);
  if (env.BETA_APPROVED_API_ORIGIN !== apiOrigin) throw new Error('BETA_APPROVED_API_ORIGIN must explicitly match the operator-approved API origin.');
  const supportUrl = supportDestination(env.EXPO_PUBLIC_BETA_SUPPORT_URL);
  const dataNotice = env.EXPO_PUBLIC_BETA_DATA_NOTICE;
  if (typeof dataNotice !== 'string' || dataNotice.trim().length < 20 || dataNotice.length > 2000 || /TODO|TBD|placeholder|待確認/i.test(dataNotice)) throw new Error('A confirmed data location, retention/removal and deletion-request notice is required.');
  const code = env.ANDROID_VERSION_CODE;
  if (!/^[1-9]\d{0,8}$/.test(code ?? '')) throw new Error('ANDROID_VERSION_CODE must be an explicit positive integer.');
  if (env.BETA_CONFIGURATION_APPROVED !== '1') throw new Error('Operator configuration approval is required before packaging.');
  return { variant, apiOrigin, supportUrl, dataNotice: dataNotice.trim(), versionCode: Number(code) };
}
module.exports = { variants, previewPackage, hostedOrigin, supportDestination, validateRelease };
