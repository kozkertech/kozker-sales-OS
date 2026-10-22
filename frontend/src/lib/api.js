import axios from "axios";
import { mockRequest, mockChat } from "@/lib/mockData";

const USE_MOCK = !process.env.REACT_APP_BACKEND_URL;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

const realApi = axios.create({ baseURL: API, withCredentials: true });

function parsePath(url) {
  const queryIndex = url.indexOf("?");
  const path = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
  return path;
}

const mockApi = {
  get(url, config) {
    return mockRequest("get", url, null).then((data) => ({ data }));
  },
  post(url, body, config) {
    return mockRequest("post", url, body).then((data) => ({ data }));
  },
  put(url, body, config) {
    return mockRequest("put", url, body).then((data) => ({ data }));
  },
  delete(url, config) {
    return mockRequest("delete", url, null).then((data) => ({ data }));
  },
};

const api = USE_MOCK ? mockApi : realApi;

export function apiErr(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export { USE_MOCK, mockChat };

export default api;
