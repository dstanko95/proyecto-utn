const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('reqrefiner_jwt');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('reqrefiner_jwt', token);
  }

  getToken() {
    return this.token;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('reqrefiner_jwt');
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error de conexión' }));
      throw new Error(errorData.message || `Error HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth Methods
  async register(email: string, password: string, firstName: string, lastName: string) {
    const data = await this.request<{ accessToken: string; user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ accessToken: string; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async getMe() {
    return this.request<UserProfile>('/auth/me');
  }

  async checkAuth(): Promise<UserProfile | null> {
    if (!this.token) return null;
    try {
      return await this.getMe();
    } catch (e) {
      this.logout();
      return null;
    }
  }

  // Project & Initial Context Methods
  async getProjects() {
    return this.request<any[]>('/projects');
  }

  async createProject(name: string, initialContextMarkdown?: string) {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, initialContextMarkdown }),
    });
  }

  async analyzeContext(contextMarkdown: string) {
    return this.request<any>('/projects/analyze-context', {
      method: 'POST',
      body: JSON.stringify({ contextMarkdown }),
    });
  }

  async validateContext(projectId: string, contextSummary: string, actors: string[] = []) {
    return this.request<any>(`/projects/${projectId}/validate-context`, {
      method: 'POST',
      body: JSON.stringify({ contextSummary, actors }),
    });
  }

  async getProjectById(id: string) {
    return this.request<any>(`/projects/${id}`);
  }

  async deleteProject(id: string) {
    return this.request<any>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async getRequirementsByProject(projectId: string) {
    return this.request<any[]>(`/requirements/project/${projectId}`);
  }

  // Requirement & AI Analysis Methods
  async analyzeRequirement(requirementText: string, projectId: string, userAnswers: string[] = []) {
    return this.request<any>('/requirements/analyze', {
      method: 'POST',
      body: JSON.stringify({ requirementText, projectId, userAnswers }),
    });
  }

  async createRequirement(code: string, title: string, description: string, projectId: string, initialMermaid?: string, dependencies?: string[], rules?: any[]) {
    return this.request<any>('/requirements', {
      method: 'POST',
      body: JSON.stringify({ code, title, description, projectId, initialMermaid, dependencies, rules }),
    });
  }

  async approveRequirement(id: string) {
    return this.request<any>(`/requirements/${id}/approve`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
