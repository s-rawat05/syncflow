/**
 * SyncFlow Frontend API Client
 * Manages HTTP communications with backend, JWT tokens, and graceful offline/guest mode fallback.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('syncflow_token') || null;
    this.isOnline = true;
    this.onStatusChangeCallbacks = new Set();
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('syncflow_token', token);
    } else {
      localStorage.removeItem('syncflow_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('syncflow_token');
  }

  onStatusChange(cb) {
    this.onStatusChangeCallbacks.add(cb);
    return () => this.onStatusChangeCallbacks.delete(cb);
  }

  notifyStatus(status) {
    if (this.isOnline !== status) {
      this.isOnline = status;
      this.onStatusChangeCallbacks.forEach(cb => cb(status));
    }
  }

  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      const online = res.ok;
      this.notifyStatus(online);
      return online;
    } catch {
      this.notifyStatus(false);
      return false;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      this.notifyStatus(true);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
        this.notifyStatus(false);
        const netErr = new Error('Backend server is currently offline or unreachable.');
        netErr.isOffline = true;
        throw netErr;
      }
      throw err;
    }
  }

  // --- Auth Endpoints ---
  async signup(name, email, password) {
    const data = await this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async getMe() {
    if (!this.getToken()) return null;
    try {
      const data = await this.request('/api/auth/me');
      return data.user;
    } catch (err) {
      if (err.status === 401) {
        this.setToken(null);
      }
      throw err;
    }
  }

  logout() {
    this.setToken(null);
  }

  // --- Algorithms ---
  async getAlgorithms() {
    const data = await this.request('/api/algorithms');
    return data.algorithms || [];
  }

  // --- Scenarios ---
  async getMyScenarios() {
    const data = await this.request('/api/scenarios');
    return data.scenarios || [];
  }

  async getPublicScenarios() {
    const data = await this.request('/api/scenarios/public');
    return data.scenarios || [];
  }

  async getScenario(id) {
    const data = await this.request(`/api/scenarios/${id}`);
    return data.scenario;
  }

  async createScenario(scenarioData) {
    const data = await this.request('/api/scenarios', {
      method: 'POST',
      body: JSON.stringify(scenarioData)
    });
    return data.scenario;
  }

  async updateScenario(id, updateData) {
    const data = await this.request(`/api/scenarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    return data.scenario;
  }

  async duplicateScenario(id) {
    const data = await this.request(`/api/scenarios/${id}/duplicate`, {
      method: 'POST'
    });
    return data.scenario;
  }

  async deleteScenario(id) {
    return await this.request(`/api/scenarios/${id}`, {
      method: 'DELETE'
    });
  }

  async importScenario(importData) {
    const data = await this.request('/api/scenarios/import', {
      method: 'POST',
      body: JSON.stringify(importData)
    });
    return data.scenario;
  }

  async getLeaderboard(scenarioId) {
    const data = await this.request(`/api/scenarios/${scenarioId}/leaderboard`);
    return data.leaderboard || [];
  }

  // --- Runs ---
  async saveRun(runData) {
    return await this.request('/api/runs', {
      method: 'POST',
      body: JSON.stringify(runData)
    });
  }

  async saveRace(raceData) {
    return await this.request('/api/runs/race', {
      method: 'POST',
      body: JSON.stringify(raceData)
    });
  }

  async getRuns(scenarioId = null) {
    const query = scenarioId ? `?scenarioId=${scenarioId}` : '';
    const data = await this.request(`/api/runs${query}`);
    return data.runs || [];
  }

  async getRun(id) {
    return await this.request(`/api/runs/${id}`);
  }

  async verifyRun(id) {
    return await this.request(`/api/runs/${id}/verify`);
  }

  // --- Stats ---
  async getMyStats() {
    const data = await this.request('/api/me/stats');
    return data.stats;
  }
}

export const api = new ApiClient();
