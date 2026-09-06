/* ONE auth system with a pluggable identity provider: Cognito (production, Amplify v6) or local (explicitly enabled dev/self-host). */
import axios from 'axios';

const BASE = process.env.REACT_APP_BACKEND_URL;
const TOKEN_KEY = 'nv.token';
let config = null;
let amplify = null;

export async function loadAuthConfig() {
  if (config) return config;
  const { data } = await axios.get(`${BASE}/api/v1/auth/config`);
  config = data;
  if (data.provider === 'cognito') {
    const { Amplify } = await import('aws-amplify');
    amplify = await import('aws-amplify/auth');
    Amplify.configure({ Auth: { Cognito: { userPoolId: data.cognito.user_pool_id, userPoolClientId: data.cognito.client_id } } });
  }
  return config;
}

export const providerName = () => config?.provider || 'local';

export async function getToken() {
  if (config?.provider === 'cognito' && amplify) {
    try {
      const { tokens } = await amplify.fetchAuthSession();
      return tokens?.accessToken?.toString() || null;
    } catch {
      return null;
    }
  }
  return localStorage.getItem(TOKEN_KEY);
}

export async function signUp({ email, password, name }) {
  await loadAuthConfig();
  if (config.provider === 'cognito') {
    await amplify.signUp({ username: email, password, options: { userAttributes: { email, name } } });
    return { needsConfirmation: true };
  }
  if (config.provider === 'disabled') throw new Error('Authentication is not configured on the server (Cognito env vars are blank).');
  const { data } = await axios.post(`${BASE}/api/v1/auth/signup`, { email, password, name });
  localStorage.setItem(TOKEN_KEY, data.token);
  return { user: data.user };
}

export async function confirmSignUp(email, code) {
  await amplify.confirmSignUp({ username: email, confirmationCode: code });
}

export async function signIn({ email, password }) {
  await loadAuthConfig();
  if (config.provider === 'cognito') {
    const r = await amplify.signIn({ username: email, password });
    if (r.nextStep?.signInStep !== 'DONE') throw new Error(`Additional step required: ${r.nextStep.signInStep}`);
    return {};
  }
  if (config.provider === 'disabled') throw new Error('Authentication is not configured on the server (Cognito env vars are blank).');
  const { data } = await axios.post(`${BASE}/api/v1/auth/login`, { email, password });
  localStorage.setItem(TOKEN_KEY, data.token);
  return { user: data.user };
}

export async function forgotPassword(email) {
  await loadAuthConfig();
  if (config.provider !== 'cognito') throw new Error('Password recovery is handled by Cognito in production. In local mode, contact your administrator.');
  await amplify.resetPassword({ username: email });
}

export async function confirmForgotPassword(email, code, newPassword) {
  await amplify.confirmResetPassword({ username: email, confirmationCode: code, newPassword });
}

export async function signOut() {
  localStorage.removeItem(TOKEN_KEY);
  if (config?.provider === 'cognito' && amplify) {
    try { await amplify.signOut(); } catch { /* ignore */ }
  }
  if (!window.location.pathname.startsWith('/auth')) window.location.assign('/auth');
}
