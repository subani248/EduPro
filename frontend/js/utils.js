const API_URL = 'https://edupro-dyg1.onrender.com/api';

const fetchAPI = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData, do not set Content-Type
  // otherwise, set it to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};

const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

const checkAuth = (allowedRole) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'index.html';
        return null;
    }
    const user = JSON.parse(userStr);
    if (allowedRole && user.role !== allowedRole) {
        if(user.role === 'Student') window.location.href = 'student-dashboard.html';
        else window.location.href = 'teacher-dashboard.html';
    }
    return user;
}
