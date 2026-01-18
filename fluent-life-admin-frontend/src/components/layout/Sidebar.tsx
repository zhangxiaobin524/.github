import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Home,
  BarChart3,
  Shield,
  Settings,
  MessageSquare,
  BookOpen,
  FileSearch,
  MessageCircle,
  UserPlus,
  ThumbsUp,
  ChevronDown,
  ChevronRight,
  Users as UsersGroup,
  MessageSquare as CommunityGroup,
  Activity as TrainingGroup,
  Book as ContentGroup,
  Cog as SystemGroup,
  Video,
  List,
} from 'lucide-react';
import clsx from 'clsx';
import { useMenuContext } from '../../contexts/MenuContext';
import { Menu } from '../../types/index';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  children?: MenuItem[];
  group?: boolean; // 是否为分组标题
}

// 图标映射表
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Home,
  BarChart3,
  Shield,
  Settings,
  MessageSquare,
  BookOpen,
  FileSearch,
  MessageCircle,
  ThumbsUp,
  UsersGroup,
  CommunityGroup,
  TrainingGroup,
  ContentGroup,
  SystemGroup,
  Video,
  List,
  Dashboard: LayoutDashboard,
  // 默认图标
  default: FileText,
};

// 获取图标组件
const getIconComponent = (iconName?: string): React.ComponentType<{ className?: string }> => {
  if (!iconName) return iconMap.default;
  return iconMap[iconName] || iconMap.default;
};

// 默认菜单项（用于向后兼容）
const defaultMenuItems: MenuItem[] = [
  {
    key: 'dashboard',
    label: '数据概览',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    key: 'users',
    label: '用户管理',
    icon: Users,
    path: '/users',
  },
  {
    key: 'videos',
    label: '视频管理',
    icon: FileText,
    path: '/videos',
  },
  {
    key: 'community',
    label: '社区管理',
    icon: CommunityGroup,
    group: true,
    children: [
      {
        key: 'posts',
        label: '帖子管理',
        icon: FileText,
        path: '/posts',
      },
      {
        key: 'comments',
        label: '评论管理',
        icon: MessageCircle,
        path: '/comments',
      },
      {
        key: 'post-likes',
        label: '点赞管理',
        icon: ThumbsUp,
        path: '/post-likes',
      },
      {
        key: 'follows-collections',
        label: '关注/收藏',
        icon: UserPlus,
        path: '/follows-collections',
      },
    ],
  },
  {
    key: 'training',
    label: '训练管理',
    icon: TrainingGroup,
    group: true,
    children: [
      {
        key: 'training-stats',
        label: '训练统计',
        icon: BarChart3,
        path: '/training',
      },
      {
        key: 'rooms',
        label: '房间管理',
        icon: Home,
        path: '/rooms',
      },
    ],
  },
  {
    key: 'exposure',
    label: '脱敏练习',
    icon: Users,
    group: true,
    children: [
      {
        key: 'exposure-modules',
        label: '脱敏练习场景管理',
        icon: FileText,
        path: '/exposure-modules',
      },
    ],
  },
  {
    key: 'content',
    label: '内容管理',
    icon: ContentGroup,
    group: true,
    children: [
      {
        key: 'tongue-twisters',
        label: '绕口令管理',
        icon: MessageSquare,
        path: '/tongue-twisters',
      },
      {
        key: 'daily-expressions',
        label: '每日朗诵文案',
        icon: BookOpen,
        path: '/daily-expressions',
      },
      {
        key: 'speech-techniques',
        label: '语音技巧训练',
        icon: MessageSquare,
        path: '/speech-techniques',
      },
      {
        key: 'legal-documents',
        label: '法律文档',
        icon: FileText,
        path: '/legal-documents',
      },
      {
        key: 'app-settings',
        label: '应用设置',
        icon: Settings,
        path: '/app-settings',
      },
      {
        key: 'help-categories',
        label: '帮助分类',
        icon: FileSearch,
        path: '/help-categories',
      },
      {
        key: 'help-articles',
        label: '帮助文章',
        icon: MessageSquare,
        path: '/help-articles',
      },
    ],
  },
  {
    key: 'ai',
    label: 'AI管理',
    icon: MessageSquare,
    group: true,
    children: [
      {
        key: 'ai-roles',
        label: 'AI模拟角色管理',
        icon: Users,
        path: '/ai-roles',
      },
      {
        key: 'voice-types',
        label: '音色管理',
        icon: Settings,
        path: '/voice-types',
      },
    ],
  },
  {
    key: 'system',
    label: '系统管理',
    icon: SystemGroup,
    group: true,
    children: [
      {
        key: 'operation-logs',
        label: '操作日志',
        icon: FileSearch,
        path: '/operation-logs',
      },
      {
        key: 'permission',
        label: '权限管理',
        icon: Shield,
        path: '/permission',
      },
      {
        key: 'settings',
        label: '系统设置',
        icon: Settings,
        path: '/settings',
      },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

// 将后端菜单转换为 Sidebar 菜单项格式
const convertMenuToMenuItem = (menu: Menu): MenuItem | null => {
  if (!menu.path && (!menu.children || menu.children.length === 0)) {
    // 如果没有路径且没有子菜单，跳过
    return null;
  }

  const hasChildren = menu.children && menu.children.length > 0;
  const children = hasChildren
    ? menu.children!.map(child => convertMenuToMenuItem(child)).filter((item): item is MenuItem => item !== null)
    : undefined;

  return {
    key: menu.id,
    label: menu.name,
    icon: getIconComponent(menu.icon),
    path: menu.path || undefined,
    children,
    group: hasChildren && !menu.path, // 有子菜单且没有路径的是分组标题
  };
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();
  const { menus: apiMenus, loading } = useMenuContext();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['community', 'training', 'content', 'ai', 'system']);

  // 将后端菜单转换为侧边栏菜单项
  // 暂时强制使用默认菜单，确保所有功能正常访问
  // 如果需要使用API菜单，可以在这里取消注释并启用API菜单逻辑
  const menuItems = useMemo(() => {
    // 暂时禁用API菜单，直接使用默认菜单
    // TODO: 等后端菜单数据完善后，再启用API菜单功能
    /*
    if (apiMenus && apiMenus.length >= 10) {
      const converted = apiMenus
        .map(menu => convertMenuToMenuItem(menu))
        .filter((item): item is MenuItem => item !== null);
      
      if (converted.length >= 10) {
        return converted;
      }
    }
    */
    return defaultMenuItems;
  }, [apiMenus]);

  // 当菜单数据更新时，自动展开有子菜单的分组
  useEffect(() => {
    if (apiMenus && apiMenus.length > 0) {
      const groupsWithChildren = menuItems
        .filter(item => item.children && item.children.length > 0)
        .map(item => item.key);
      
      if (groupsWithChildren.length > 0) {
        setExpandedGroups(groupsWithChildren);
      }
    }
  }, [apiMenus, menuItems]);

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isGroupExpanded = (key: string) => expandedGroups.includes(key);

  const hasActiveChild = (item: MenuItem): boolean => {
    if (item.path) {
      return isActive(item.path);
    }
    if (item.children) {
      return item.children.some((child) => hasActiveChild(child));
    }
    return false;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon;
    const active = item.path ? isActive(item.path) : false;
    const hasActive = hasActiveChild(item);
    const isGroup = item.group || (item.children && item.children.length > 0);
    const expanded = isGroup && isGroupExpanded(item.key);

    if (isGroup && !item.path) {
      // 分组标题
      return (
        <div key={item.key} className="mb-1">
          <button
            onClick={() => toggleGroup(item.key)}
            className={clsx(
              'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
              {
                'text-gray-900 bg-gray-50': hasActive,
                'text-gray-600 hover:bg-gray-50': !hasActive,
              }
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed && (
              expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            )}
          </button>
          {expanded && !collapsed && item.children && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // 普通菜单项
    if (item.path) {
      return (
        <Link
          key={item.key}
          to={item.path}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
            {
              'bg-blue-50 text-blue-600': active,
              'text-gray-700 hover:bg-gray-50': !active,
              'ml-4': level > 0,
            }
          )}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      );
    }

    return null;
  };

  return (
    <aside
      className={clsx(
        'bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-40 transition-all overflow-y-auto',
        collapsed ? 'w-64' : 'w-64'
      )}
    >
      <div className="h-16 flex items-center px-6 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold text-gray-900">流畅人生</div>
              <div className="text-xs text-gray-500">管理后台</div>
            </div>
          )}
        </div>
      </div>
      <nav className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-1">
            {menuItems.map((item) => renderMenuItem(item))}
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;

