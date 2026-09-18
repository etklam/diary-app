import { createApiClient, createNativeSession, NativeSessionError } from '@diary/api-client';
import { authUserResponseSchema } from '@diary/contracts';

const baseUrl = process.env.DIARY_API_BASE_URL;
const email = process.env.DIARY_TEST_EMAIL;
const password = process.env.DIARY_TEST_PASSWORD;
if (!baseUrl || !email || !password) {
  throw new Error('DIARY_API_BASE_URL, DIARY_TEST_EMAIL, and DIARY_TEST_PASSWORD are required.');
}

let stored = null;
const storage = {
  get: () => stored,
  set: (value) => { stored = value; },
  clear: () => { stored = null; },
};
const first = createNativeSession({ baseUrl, storage });
let invalidCredentialsMapped = false;
try {
  await first.login({ email, password: `${password}-known-wrong` });
} catch (error) {
  invalidCredentialsMapped = error instanceof NativeSessionError
    && error.code === 'AUTH_LOGIN_INVALID_CREDENTIALS';
}
if (!invalidCredentialsMapped) throw new Error('Invalid credentials did not use the expected contract code.');

const loggedIn = await first.login({ email, password });
const firstApi = createApiClient({ baseUrl, fetch: first.fetch });
const me = await firstApi.GET('/api/auth/me');
const firstUser = authUserResponseSchema.parse(me.data).data;
if (firstUser.id !== loggedIn.user.id) throw new Error('Login owner did not match /api/auth/me.');

const restored = createNativeSession({ baseUrl, storage });
const restoredApi = createApiClient({ baseUrl, fetch: restored.fetch });
const restoredMe = await restoredApi.GET('/api/auth/me');
const restoredUser = authUserResponseSchema.parse(restoredMe.data).data;
if (restoredUser.id !== loggedIn.user.id) throw new Error('Restored owner did not match the login owner.');

await restored.logout();
if (stored !== null) throw new Error('Logout did not clear local storage.');
const signedOut = createNativeSession({ baseUrl, storage });
const signedOutApi = createApiClient({ baseUrl, fetch: signedOut.fetch });
const signedOutMe = await signedOutApi.GET('/api/auth/me');
if (signedOutMe.response.status !== 401) throw new Error('Relaunched signed-out client was not rejected.');

console.log(JSON.stringify({ invalidCredentialsMapped: true, loginOwnerVerified: true,
  restoredOwnerVerified: true, logoutClearedLocalSession: true, relaunchSignedOut: true }));
