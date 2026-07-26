import axios from 'axios';

const API_BASE_URL = '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

// Request Cancellation and Duplicate Prevention map
const pendingRequests = new Map();

const getRequestKey = (config) => {
  return `${config.method}:${config.url}`;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    if (!navigator.onLine) {
      return Promise.reject(new Error('Network offline. Please check your connection.'));
    }

    // Cancel duplicate requests if it's a GET request
    if (config.method === 'get') {
      const requestKey = getRequestKey(config);
      if (pendingRequests.has(requestKey)) {
        const controller = pendingRequests.get(requestKey);
        controller.abort('Duplicate request cancelled');
      }
      
      const controller = new AbortController();
      config.signal = controller.signal;
      pendingRequests.set(requestKey, controller);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    // Remove from pending requests on success
    if (response.config.method === 'get') {
      pendingRequests.delete(getRequestKey(response.config));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Remove from pending requests on error
    if (originalRequest?.method === 'get') {
      pendingRequests.delete(getRequestKey(originalRequest));
    }

    if (axios.isCancel(error)) {
      console.warn('Request cancelled:', error.message);
      // Return a pending promise so the caller's try/catch doesn't throw a UI error for aborted duplicates
      return new Promise(() => {});
    }

    // Network error handling
    if (!error.response) {
      console.error('Network Error / Timeout:', error.message);
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        // Optionally dispatch custom event for Logout
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(err);
      }
    }

    if (status === 403) {
      console.error('Forbidden access (403).');
    }

    if (status === 429) {
      console.error('Too many requests (429). Please wait and try again.');
    }

    if (status >= 500) {
      console.error('Internal Server Error (500+).');
    }

    return Promise.reject(error);
  }
);

export default api;
