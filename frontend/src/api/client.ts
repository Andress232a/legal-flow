import axios from 'axios';

const iamClient = axios.create({
  baseURL: '/api/iam',
  headers: { 'Content-Type': 'application/json' },
});

const docClient = axios.create({
  baseURL: '/api/docs-service',
  headers: { 'Content-Type': 'application/json' },
});

function attachInterceptors(instance: typeof iamClient) {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          try {
            const { data } = await axios.post('/api/iam/token/refresh/', { refresh });
            localStorage.setItem('access_token', data.access);
            original.headers.Authorization = `Bearer ${data.access}`;
            return instance(original);
          } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(error);
    }
  );
}

attachInterceptors(iamClient);
attachInterceptors(docClient);

export { iamClient, docClient };
