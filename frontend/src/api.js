const API_BASE_URL = 'http://localhost:5001/api';

export const api = {
  /**
   * Fetches dashboard metric stats (Revenue, Orders, Catalog, Customers count).
   */
  async getDashboardStats() {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch dashboard metrics.');
    return json.data;
  },

  /**
   * Fetches dashboard charts data (Monthly sales & Category breakdowns).
   */
  async getDashboardCharts() {
    const res = await fetch(`${API_BASE_URL}/dashboard/charts`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch dashboard chart telemetry.');
    return json.data;
  },

  /**
   * Fetches dashboard lists (Recent orders & Top stocked items).
   */
  async getRecentActivity() {
    const res = await fetch(`${API_BASE_URL}/dashboard/recent-activity`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch recent activity list.');
    return json.data;
  },

  /**
   * Fetches search-filtered, paginated orders.
   * @param {object} params { page, limit, search }
   */
  async getOrders({ page = 1, limit = 15, search = '' } = {}) {
    const url = `${API_BASE_URL}/orders?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch orders dataset.');
    return json.data;
  },

  /**
   * Fetches search-filtered, paginated customers.
   * @param {object} params { page, limit, search }
   */
  async getCustomers({ page = 1, limit = 12, search = '' } = {}) {
    const url = `${API_BASE_URL}/customers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch customers list.');
    return json.data;
  },

  /**
   * Securly requests query execution using a server-side cached queryId UUID.
   * @param {string} queryId 
   */
  async executeChatQuery(queryId) {
    const res = await fetch(`${API_BASE_URL}/chat/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ queryId })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Query execution failed.');
    return json.data;
  },

  /**
   * Fetches active models list from the backend REST gateway.
   */
  async getModels() {
    const res = await fetch(`${API_BASE_URL}/chat/models`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to retrieve models.');
    return json.models;
  },

  /**
   * Gets the SSE streaming connection URL.
   * @param {string} message
   * @param {string} model
   */
  getChatStreamUrl(message, model = 'auto') {
    return `${API_BASE_URL}/chat/stream?message=${encodeURIComponent(message)}&model=${encodeURIComponent(model)}`;
  }
};


export default api;
