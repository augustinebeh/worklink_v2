/**
 * Centralized API Client for WorkLink Admin Portal
 *
 * Features:
 * - Centralized configuration and base URL management
 * - Automatic authentication token attachment
 * - Request/response interceptors for error handling
 * - Consistent error formatting
 * - Built-in retry logic for network errors
 * - Request/response logging in development
 */

class ApiClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '';
    this.timeout = 10000; // 10 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second

    // Request interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];

    this.setupDefaultInterceptors();
  }

  setupDefaultInterceptors() {
    // Add auth token to all requests
    this.requestInterceptors.push((config) => {
      const token = sessionStorage.getItem('admin_token');
      if (token && token !== 'demo-admin-token') {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      return config;
    });

    // Add content-type for JSON requests
    this.requestInterceptors.push((config) => {
      if (config.body && typeof config.body === 'object') {
        config.headers = {
          ...config.headers,
          'Content-Type': 'application/json'
        };
        config.body = JSON.stringify(config.body);
      }
      return config;
    });

    // Log requests in development
    if (import.meta.env.DEV) {
      this.requestInterceptors.push((config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase() || 'GET'} ${config.url}`);
        return config;
      });
    }

    // Handle response errors
    this.responseInterceptors.push(async (response, config) => {
      if (!response.ok) {
        const error = await this.handleErrorResponse(response, config);
        throw error;
      }

      // Log successful responses in development
      if (import.meta.env.DEV) {
        console.log(`✅ API Response: ${response.status} ${config.method?.toUpperCase() || 'GET'} ${config.url}`);
      }

      return response;
    });
  }

  async handleErrorResponse(response, config) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.status = response.status;
    error.config = config;

    try {
      const errorData = await response.json();
      error.data = errorData;
      error.message = errorData.message || error.message;
    } catch {
      // Response is not JSON, use default message
    }

    // Handle specific error types
    switch (response.status) {
      case 401:
        error.message = 'Authentication required. Please log in again.';
        // Could trigger logout here
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          console.warn('🔐 Authentication error detected');
          sessionStorage.removeItem('admin_token');
          sessionStorage.removeItem('admin_user');
        }
        break;
      case 403:
        error.message = 'You do not have permission to access this resource.';
        break;
      case 404:
        error.message = 'The requested resource was not found.';
        break;
      case 422:
        error.message = 'Invalid data provided. Please check your inputs.';
        break;
      case 429:
        error.message = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
        error.message = 'Server error. Please try again later.';
        break;
      case 503:
        error.message = 'Service temporarily unavailable. Please try again later.';
        break;
    }

    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${response.status} ${config.method?.toUpperCase() || 'GET'} ${config.url}`, error);
    }

    return error;
  }

  async request(url, options = {}) {
    // Prepare config
    let config = {
      method: 'GET',
      headers: {},
      ...options,
      url: this.baseURL + url
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Make the request with retry logic
      let lastError;

      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const response = await fetch(config.url, {
            method: config.method,
            headers: config.headers,
            body: config.body,
            signal: controller.signal,
            ...config
          });

          // Apply response interceptors
          let processedResponse = response;
          for (const interceptor of this.responseInterceptors) {
            processedResponse = await interceptor(processedResponse, config);
          }

          clearTimeout(timeoutId);
          return processedResponse;
        } catch (error) {
          lastError = error;

          // Don't retry on certain errors
          if (error.name === 'AbortError' || error.status < 500) {
            throw error;
          }

          // Only retry on network errors or 5xx server errors
          if (attempt < this.retryAttempts) {
            console.warn(`🔄 Retrying request (${attempt}/${this.retryAttempts}): ${config.url}`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
          }
        }
      }

      throw lastError;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout');
        timeoutError.status = 408;
        timeoutError.config = config;
        throw timeoutError;
      }

      throw error;
    }
  }

  // Convenience methods
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, data, options = {}) {
    return this.request(url, { ...options, method: 'POST', body: data });
  }

  async put(url, data, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body: data });
  }

  async patch(url, data, options = {}) {
    return this.request(url, { ...options, method: 'PATCH', body: data });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  // JSON convenience methods
  async getJSON(url, options = {}) {
    const response = await this.get(url, options);
    return response.json();
  }

  async postJSON(url, data, options = {}) {
    const response = await this.post(url, data, options);
    return response.json();
  }

  async putJSON(url, data, options = {}) {
    const response = await this.put(url, data, options);
    return response.json();
  }

  async patchJSON(url, data, options = {}) {
    const response = await this.patch(url, data, options);
    return response.json();
  }

  async deleteJSON(url, options = {}) {
    const response = await this.delete(url, options);
    return response.json();
  }

  // Add custom request interceptor
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add custom response interceptor
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export { ApiClient };

export default apiClient;