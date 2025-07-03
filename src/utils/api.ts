import axios from 'axios';

const api = axios.create({
  // @ts-ignore
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Ensure credentials are always included
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common error cases
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log(`${response.config.method?.toUpperCase()} ${response.config.url}:`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Extract useful error information without circular references
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    };

    console.error('API Error:', errorInfo);

    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Clear stored credentials and redirect to login
          localStorage.removeItem('codepush_access_key');
          delete api.defaults.headers.common['Authorization'];
          if (window.location.pathname !== '/code-push/login') {
            window.location.href = '/code-push/login';
          }
          break;
        case 403:
          console.error('Access forbidden:', errorInfo.data);
          break;
        case 404:
          console.error('Resource not found:', errorInfo.data);
          break;
      }
    }
    return Promise.reject(error);
  }
);

// Add rollback function to rollback a deployment to a previous version
export const rollbackDeployment = async (appName: string, deploymentName: string, targetRelease?: string) => {
  const url = `/apps/${appName}/deployments/${deploymentName}/rollback${targetRelease ? `/${targetRelease}` : ''}`;
  return api.post(url);
};

export default api; 