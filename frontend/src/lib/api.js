import axios from "axios";

let rawBackendUrl = (process.env.REACT_APP_BACKEND_URL || "").trim().replace(/\/+$/, "");
if (rawBackendUrl && !rawBackendUrl.startsWith("http://") && !rawBackendUrl.startsWith("https://")) {
  rawBackendUrl = `https://${rawBackendUrl}`;
}
const BACKEND_URL = rawBackendUrl;
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const TOKEN_KEY = "salesmind_access_token";

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

export function clearAuthToken() {
  setAuthToken(null);
}

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: capture refreshed access tokens
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.access_token) {
      setAuthToken(response.data.access_token);
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on 401
      if (!error.config.url?.includes("/auth/login") && !error.config.url?.includes("/auth/me")) {
        clearAuthToken();
      }
    }
    return Promise.reject(error);
  }
);

export function apiErr(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
