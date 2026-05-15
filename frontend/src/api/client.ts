import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL !== undefined ? import.meta.env.VITE_API_BASE_URL : '';

const iamClient = axios.create({
  baseURL: `${baseURL}/api/iam`,
  headers: { 'Content-Type': 'application/json' },
});

const docClient = axios.create({
  baseURL: `${baseURL}/api/docs-service`,
  headers: { 'Content-Type': 'application/json' },
});

const matterClient = axios.create({
  baseURL: `${baseURL}/api/matters-service`,
  headers: { 'Content-Type': 'application/json' },
});

const timeClient = axios.create({
  baseURL: `${baseURL}/api/time-service`,
  headers: { 'Content-Type': 'application/json' },
});

const billingClient = axios.create({
  baseURL: `${baseURL}/api/billing-service`,
  headers: { 'Content-Type': 'application/json' },
});

const calendarClient = axios.create({
  baseURL: `${baseURL}/api/calendar-service`,
  headers: { 'Content-Type': 'application/json' },
});

const analyticsClient = axios.create({
  baseURL: `${baseURL}/api/analytics-service`,
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
            const { data } = await axios.post(`${baseURL}/api/iam/token/refresh/`, { refresh });
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
attachInterceptors(matterClient);
attachInterceptors(timeClient);
attachInterceptors(billingClient);
attachInterceptors(calendarClient);
attachInterceptors(analyticsClient);

export { iamClient, docClient, matterClient, timeClient, billingClient, calendarClient, analyticsClient };
