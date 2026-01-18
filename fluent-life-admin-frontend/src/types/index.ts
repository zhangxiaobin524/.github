// 用户类型
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role?: string;
  status: number; // 0-禁用, 1-正常
  gender?: string | null; // 性别
  created_at: string;
  last_login_at?: string | null; // 最近登录时间
}

// 帖子类型
export interface Post {
  id: string;
  user_id: string;
  content: string;
  tag: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user?: User;
}

// 房间类型
export interface Room {
  id: string;
  user_id: string;
  title: string;
  theme: string;
  type: string;
  max_members: number;
  current_members: number;
  is_active: boolean;
  created_at: string;
  user?: User;
}

// 训练记录类型
export interface TrainingRecord {
  id: string;
  user_id: string;
  type: string;
  duration: number;
  data?: Record<string, any>;
  timestamp: string;
  created_at: string;
  user?: User;
}

// 角色类型
export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  created_at: string;
}

// 菜单类型
export interface Menu {
  id: string;
  name: string;
  path: string;
  icon?: string;
  parent_id?: string;
  sort: number;
  children?: Menu[];
}

// 统计数据类型
export interface DashboardStats {
  total_users: number;
  total_records: number;
  meditation_count: number;
  airflow_count: number;
  exposure_count: number;
  practice_count: number;
}

// API 响应类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

// 分页类型
export interface Pagination {
  page: number;
  page_size: number;
  total: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

