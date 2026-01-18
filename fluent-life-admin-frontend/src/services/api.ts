import axios from 'axios';

const API_BASE_URL = 'http://localhost:8082/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 管理员API
export const adminAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/admin/login', { username, password });
    if (response.data.code === 0 && response.data.data?.token) {
      localStorage.setItem('admin_token', response.data.data.token);
    }
    return response.data;
  },

  // 用户管理
  getUsers: async (params: { page?: number; page_size?: number; keyword?: string }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  getUser: async (id: string) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  // 帖子管理
  getPosts: async (params: { page?: number; page_size?: number; keyword?: string }) => {
    const response = await api.get('/admin/posts', { params });
    return response.data;
  },
  getPost: async (id: string) => {
    const response = await api.get(`/admin/posts/${id}`);
    return response.data;
  },
  deletePostsBatch: async (ids: string[]) => {
    const response = await api.post('/admin/posts/delete-batch', { ids });
    return response.data;
  },

  // 房间管理
  getRooms: async (params: { page?: number; page_size?: number; keyword?: string; is_active?: string }) => {
    const response = await api.get('/admin/rooms', { params });
    return response.data;
  },
  getRoom: async (id: string) => {
    const response = await api.get(`/admin/rooms/${id}`);
    return response.data;
  },
  deleteRoom: async (id: string) => {
    const response = await api.delete(`/admin/rooms/${id}`);
    return response.data;
  },
  deleteRoomsBatch: async (ids: string[]) => {
    const response = await api.post('/admin/rooms/delete-batch', { ids });
    return response.data;
  },
  toggleRoom: async (id: string) => {
    const response = await api.patch(`/admin/rooms/${id}/toggle`);
    return response.data;
  },

  // 训练统计
  getTrainingStats: async () => {
    const response = await api.get('/admin/training/stats');
    return response.data;
  },
  getTrainingRecords: async (params: { page?: number; page_size?: number; type?: string; user_id?: string }) => {
    const response = await api.get('/admin/training/records', { params });
    return response.data;
  },

  // 绕口令管理
  getTongueTwisters: async (params: { page?: number; page_size?: number; keyword?: string; level?: string; is_active?: string }) => {
    const response = await api.get('/admin/tongue-twisters', { params });
    return response.data;
  },
  getTongueTwister: async (id: string) => {
    const response = await api.get(`/admin/tongue-twisters/${id}`);
    return response.data;
  },
  createTongueTwister: async (data: any) => {
    const response = await api.post('/admin/tongue-twisters', data);
    return response.data;
  },
  updateTongueTwister: async (id: string, data: any) => {
    const response = await api.put(`/admin/tongue-twisters/${id}`, data);
    return response.data;
  },
  deleteTongueTwistersBatch: async (ids: string[]) => {
    const response = await api.post('/admin/tongue-twisters/delete-batch', { ids });
    return response.data;
  },

  // 每日朗诵文案管理
  getDailyExpressions: async (params: { page?: number; page_size?: number; keyword?: string; is_active?: string }) => {
    const response = await api.get('/admin/daily-expressions', { params });
    return response.data;
  },
  getDailyExpression: async (id: string) => {
    const response = await api.get(`/admin/daily-expressions/${id}`);
    return response.data;
  },
  createDailyExpression: async (data: any) => {
    const response = await api.post('/admin/daily-expressions', data);
    return response.data;
  },
  updateDailyExpression: async (id: string, data: any) => {
    const response = await api.put(`/admin/daily-expressions/${id}`, data);
    return response.data;
  },
  deleteDailyExpressionsBatch: async (ids: string[]) => {
    const response = await api.post('/admin/daily-expressions/delete-batch', { ids });
    return response.data;
  },

  // AI角色管理
  getAIRoles: async () => {
    const response = await api.get('/admin/ai-roles');
    return response.data;
  },
  createAIRole: async (data: any) => {
    const response = await api.post('/admin/ai-roles', data);
    return response.data;
  },
  updateAIRole: async (id: string, data: any) => {
    const response = await api.put(`/admin/ai-roles/${id}`, data);
    return response.data;
  },
  deleteAIRole: async (id: string) => {
    const response = await api.delete(`/admin/ai-roles/${id}`);
    return response.data;
  },
  initAIRolesFromConfig: async () => {
    const response = await api.post('/admin/ai-roles/init-from-config');
    return response.data;
  },

  // 音色管理
  getVoiceTypes: async () => {
    const response = await api.get('/admin/voice-types');
    return response.data;
  },
  getEnabledVoiceTypes: async () => {
    const response = await api.get('/admin/voice-types/enabled');
    return response.data;
  },
  getVoiceType: async (id: string) => {
    const response = await api.get(`/admin/voice-types/${id}`);
    return response.data;
  },
  createVoiceType: async (data: any) => {
    const response = await api.post('/admin/voice-types', data);
    return response.data;
  },
  updateVoiceType: async (id: string, data: any) => {
    const response = await api.put(`/admin/voice-types/${id}`, data);
    return response.data;
  },
  deleteVoiceType: async (id: string) => {
    const response = await api.delete(`/admin/voice-types/${id}`);
    return response.data;
  },

  // 脱敏练习场景管理
  getExposureModules: async (params: { page?: number; page_size?: number; keyword?: string }) => {
    const response = await api.get('/admin/exposure/modules', { params });
    return response.data;
  },
  getExposureModule: async (id: string) => {
    const response = await api.get(`/admin/exposure/modules/${id}`);
    return response.data;
  },
  createExposureModule: async (data: any) => {
    const response = await api.post('/admin/exposure/modules', data);
    return response.data;
  },
  updateExposureModule: async (id: string, data: any) => {
    const response = await api.put(`/admin/exposure/modules/${id}`, data);
    return response.data;
  },
  deleteExposureModule: async (id: string) => {
    const response = await api.delete(`/admin/exposure/modules/${id}`);
    return response.data;
  },
  batchUpdateModulesOrder: async (modules: Array<{ id: string; order: number }>) => {
    const response = await api.put('/admin/exposure/modules/order', { modules });
    return response.data;
  },

  // 脱敏练习步骤管理
  getExposureModuleSteps: async (moduleId: string) => {
    const response = await api.get(`/admin/exposure/modules/${moduleId}/steps`);
    return response.data;
  },
  createExposureStep: async (moduleId: string, data: any) => {
    const response = await api.post(`/admin/exposure/modules/${moduleId}/steps`, data);
    return response.data;
  },
  updateExposureStep: async (stepId: string, data: any) => {
    const response = await api.put(`/admin/exposure/steps/${stepId}`, data);
    return response.data;
  },
  deleteExposureStep: async (stepId: string) => {
    const response = await api.delete(`/admin/exposure/steps/${stepId}`);
    return response.data;
  },
  batchUpdateStepsOrder: async (moduleId: string, steps: Array<{ id: string; order: number }>) => {
    const response = await api.put(`/admin/exposure/modules/${moduleId}/steps/order`, { steps });
    return response.data;
  },

  // 视频管理
  getVideos: async (params?: { page?: number; page_size?: number; source?: string; user_id?: string; module_id?: string }) => {
    const response = await api.get('/admin/videos', { params });
    return response.data;
  },
  getVideoDetail: async (id: string, source?: string) => {
    const response = await api.get(`/admin/videos/${id}`, { params: { source } });
    return response.data;
  },
  deleteVideo: async (id: string, source?: string) => {
    const response = await api.delete(`/admin/videos/${id}`, { params: { source } });
    return response.data;
  },
  batchDeleteVideos: async (videoIds: Array<{ id: string; source: string }>) => {
    const response = await api.post('/admin/videos/batch-delete', { video_ids: videoIds });
    return response.data;
  },

  // 权限管理 - 角色管理
  getRoles: async (params?: { page?: number; page_size?: number }) => {
    const response = await api.get('/admin/roles', { params });
    return response.data;
  },
  getRole: async (id: string) => {
    const response = await api.get(`/admin/roles/${id}`);
    return response.data;
  },
  createRole: async (data: { name: string; code: string; description?: string; permissions?: string[] }) => {
    const response = await api.post('/admin/roles', data);
    return response.data;
  },
  updateRole: async (id: string, data: { name?: string; code?: string; description?: string; permissions?: string[] }) => {
    const response = await api.put(`/admin/roles/${id}`, data);
    return response.data;
  },
  deleteRole: async (id: string) => {
    const response = await api.delete(`/admin/roles/${id}`);
    return response.data;
  },

  // 权限管理 - 菜单管理
  getMenus: async (params?: { page?: number; page_size?: number }) => {
    const response = await api.get('/admin/menus', { params });
    return response.data;
  },
  getMenu: async (id: string) => {
    const response = await api.get(`/admin/menus/${id}`);
    return response.data;
  },
  createMenu: async (data: { name: string; path?: string; icon?: string; parent_id?: string; sort?: number }) => {
    const response = await api.post('/admin/menus', data);
    return response.data;
  },
  updateMenu: async (id: string, data: { name?: string; path?: string; icon?: string; parent_id?: string; sort?: number }) => {
    const response = await api.put(`/admin/menus/${id}`, data);
    return response.data;
  },
  deleteMenu: async (id: string) => {
    const response = await api.delete(`/admin/menus/${id}`);
    return response.data;
  },
};

export default api;

