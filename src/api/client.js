const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper to make fetch requests with standard options (like credentials for HttpOnly cookies)
async function fetchClient(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for sending/receiving HttpOnly cookies
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    throw new Error('Invalid server JSON response');
  }

  if (!response.ok) {
    throw new Error(data.message || `API request failed with status ${response.status}`);
  }

  return data;
}

// ---------------------------
// MOCK MODE FLAG
// ---------------------------
// Set to false to use the real production backend.
const USE_MOCKS = false;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const authAPI = {
  register: async (email, password, name) => {
    if (USE_MOCKS) {
      await delay(800);
      return { success: true };
    }
    return fetchClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },
  
  login: async (email, password) => {
    if (USE_MOCKS) {
      await delay(800);
      if (email && password) {
        return { success: true, user: { id: 'u_1', email, name: 'Organizer' } };
      }
      throw new Error("Invalid credentials");
    }
    return fetchClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  logout: async () => {
    if (USE_MOCKS) {
      await delay(400);
      return { success: true };
    }
    return fetchClient('/auth/logout', { method: 'POST' });
  },
  
  me: async () => {
    if (USE_MOCKS) {
      await delay(400);
      // Simulate not logged in by default unless we set a flag in localStorage
      const isLogged = localStorage.getItem('mock_logged_in');
      if (isLogged) return { success: true, user: { id: 'u_1', email: 'test@example.com', name: 'Organizer' } };
      throw new Error("Not authenticated");
    }
    return fetchClient('/auth/me', { method: 'GET' });
  }
};

export const sessionAPI = {
  getSessions: async () => {
    if (USE_MOCKS) {
      await delay(400);
      return {
        success: true,
        sessions: [
          { id: 'sess_1', name: 'Tech All-Hands Q3', pin: 'TECH-88', status: 'active', participants: [{}, {}], questions: [{}, {}, {}], createdAt: new Date().toISOString() },
          { id: 'sess_2', name: 'Design System Feedback', pin: 'DS-2024', status: 'finished', participants: [{}], questions: [{}], createdAt: new Date().toISOString() },
        ]
      };
    }
    return fetchClient('/sessions', { method: 'GET' });
  },

  createSession: async (name, type = 'quiz', pin = '') => {
    if (USE_MOCKS) {
      await delay(600);
      const finalPin = pin || 'QUIZ-' + Math.floor(1000 + Math.random() * 9000);
      return {
        success: true,
        session: {
          id: 'sess_' + Date.now(),
          name,
          pin: finalPin,
          status: 'waiting',
          participants: [],
          questions: []
        }
      };
    }
    return fetchClient('/sessions', {
      method: 'POST',
      body: JSON.stringify({ name, type, pin }),
    });
  },

  deleteSession: async (id) => {
    if (USE_MOCKS) {
      await delay(300);
      return { success: true };
    }
    return fetchClient(`/sessions/${id}`, {
      method: 'DELETE',
    });
  },

  joinSession: async (pin, username) => {
    if (USE_MOCKS) {
      await delay(800);
      if (pin === 'LIME-99' || pin.startsWith('QUIZ') || pin.startsWith('TECH')) {
        return {
          success: true,
          sessionToken: 'mock_jwt_token',
          session: { id: 'sess_1', name: 'Design Systems 101' }
        };
      }
      throw new Error("Invalid PIN");
    }
    return fetchClient('/sessions/join', {
      method: 'POST',
      body: JSON.stringify({ pin, username }),
    });
  }
};
