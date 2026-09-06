import axios from 'axios';
import { getToken, signOut } from './auth';

export const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api/v1`;

export const api = axios.create({ baseURL: API, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    const body = error.response?.data?.error;
    const normalized = {
      status: status || 0,
      code: body?.code || (error.code === 'ECONNABORTED' ? 'TIMEOUT' : !error.response ? 'OFFLINE' : 'HTTP_ERROR'),
      message: body?.message || (!error.response ? 'You appear to be offline. Changes will retry when you reconnect.' : error.message),
      details: body?.details || {},
      requestId: body?.request_id,
    };
    if (status === 401 && !error.config?.url?.includes('/auth/')) signOut();
    return Promise.reject(normalized);
  }
);

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
