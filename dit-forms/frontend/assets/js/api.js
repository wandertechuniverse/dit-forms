const API_BASE = "http://localhost:8000";

const api = {
  getToken() {
    return localStorage.getItem("dit_token");
  },

  setToken(token) {
    localStorage.setItem("dit_token", token);
  },

  clearToken() {
    localStorage.removeItem("dit_token");
  },

  async request(method, path, body = null, isFormData = false) {
    const headers = {};
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!isFormData) headers["Content-Type"] = "application/json";

    const config = { method, headers };
    if (body) {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, config);

    if (res.status === 401) {
      this.clearToken();
      window.location.href = "/login.html";
      throw new Error("Session expired");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Request failed");
    }

    if (res.status === 204) return null;
    return res.json();
  },

  get(path) { return this.request("GET", path); },
  post(path, body) { return this.request("POST", path, body); },
  patch(path, body) { return this.request("PATCH", path, body); },
  delete(path) { return this.request("DELETE", path); },

  async uploadForm(path, formData) {
    return this.request("POST", path, formData, true);
  },
};

function getScope() {
  const params = new URLSearchParams(window.location.search);
  const programClassId = params.get("programClassId") || localStorage.getItem("dit_programClassId");
  const termId = params.get("termId") || localStorage.getItem("dit_termId");
  return { programClassId, termId };
}

function setScope(programClassId, termId) {
  localStorage.setItem("dit_programClassId", programClassId);
  localStorage.setItem("dit_termId", termId);
}
