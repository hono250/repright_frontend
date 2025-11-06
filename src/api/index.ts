const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export function getToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setToken(token: string) {
  localStorage.setItem('authToken', token);
}

export function clearToken() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
}

// Generic API call
async function apiCall(endpoint: string, body: any = {}) {
  const token = getToken();
  const requestBody = token ? { ...body, token } : body;
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  
  const data = await response.json();

  if (data.error || !response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

// Auth
export const auth = {
  register: (username: string, password: string) => 
    apiCall('/UserAuthentication/register', { username, password }),
  
  login: (username: string, password: string) => 
    apiCall('/UserAuthentication/login', { username, password }),
  
  logout: () => apiCall('/UserAuthentication/logout'),
};

// Templates
export const templates = {
  getAll: () => apiCall('/WorkoutTemplate/getTemplates', {}),
  get: (name: string) => apiCall('/WorkoutTemplate/getTemplate', { name }),
  create: (name: string, exercises: any[]) => 
    apiCall('/WorkoutTemplate/createTemplate', { name, exercises }),
  update: (name: string, exercises: any[]) =>
    apiCall('/WorkoutTemplate/updateTemplate', { name, exercises }),
  delete: (name: string) => apiCall('/WorkoutTemplate/deleteTemplate', { name }),
  markUsed: (name: string, date: Date) =>
    apiCall('/WorkoutTemplate/markTemplateUsed', { name, date }),
};

// Workout Log
export const workoutLog = {
  logSet: (exercise: string, weight: number | null, reps: number | null, duration: number | null) =>
    apiCall('/WorkoutLog/logSet', { exercise, weight, reps, duration }),
  getHistory: (exercise: string, weeksBack?: number) =>
    apiCall('/WorkoutLog/getHistory', { exercise, weeksBack }),
  getSummary: (exercise: string, weeksBack?: number) =>
    apiCall('/WorkoutLog/getSummary', { exercise, weeksBack }),
  getLastWorkout: (exercise: string) =>
    apiCall('/WorkoutLog/getLastWorkout', { exercise }),
};

// Exercise Library
export const exercises = {
  search: (query: string, filters?: any) =>
    apiCall('/ExerciseLibrary/searchExercises', { query, filters }),
  get: (name: string) =>
    apiCall('/ExerciseLibrary/getExercise', { name }),
  addCustom: (name: string, hasWeight: boolean, trackingType: string, metadata?: any) =>
    apiCall('/ExerciseLibrary/addCustomExercise', { name, hasWeight, trackingType, metadata }),
  updateCustom: (name: string, updates: any) =>
    apiCall('/ExerciseLibrary/updateCustomExercise', { name, updates }),
  deleteCustom: (name: string) =>
    apiCall('/ExerciseLibrary/deleteCustomExercise', { name }),
};

// Progression Guidance
export const progression = {
  generate: (exercise: string, workoutSummary: any) =>
    apiCall('/ProgressionGuidance/generateRecommendationLLM', { exercise, workoutSummary }),
  get: (exercise: string) =>
    apiCall('/ProgressionGuidance/getRecommendation', { exercise }),
  accept: (exercise: string, createdAt: Date) =>
    apiCall('/ProgressionGuidance/acceptRecommendation', { exercise, createdAt }),
  dismiss: (exercise: string, createdAt: Date) =>
    apiCall('/ProgressionGuidance/dismissRecommendation', { exercise, createdAt }),
  getHistory: (exercise: string) =>
    apiCall('/ProgressionGuidance/getRecommendationHistory', { exercise }),
};