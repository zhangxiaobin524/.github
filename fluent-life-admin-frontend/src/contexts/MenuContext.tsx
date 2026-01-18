import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAPI } from '../services/api';
import { Menu } from '../types/index';

interface MenuContextType {
  menus: Menu[];
  loading: boolean;
  refreshMenus: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const useMenuContext = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenuContext must be used within a MenuProvider');
  }
  return context;
};

interface MenuProviderProps {
  children: ReactNode;
}

export const MenuProvider: React.FC<MenuProviderProps> = ({ children }) => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMenus = async () => {
    setLoading(true);
    try {
      // 获取所有菜单（不分页）
      const response = await adminAPI.getMenus({ page: 1, page_size: 1000 });
      if (response.code === 0 && response.data) {
        // 将菜单列表转换为树形结构
        const menuList = response.data.menus || [];
        const menuMap = new Map<string, Menu>();
        const rootMenus: Menu[] = [];

        // 先创建所有菜单的映射
        menuList.forEach((menu: Menu) => {
          menuMap.set(menu.id, { ...menu, children: [] });
        });

        // 构建树形结构
        menuList.forEach((menu: Menu) => {
          const menuNode = menuMap.get(menu.id)!;
          if (menu.parent_id && menuMap.has(menu.parent_id)) {
            const parent = menuMap.get(menu.parent_id)!;
            if (!parent.children) {
              parent.children = [];
            }
            parent.children.push(menuNode);
          } else {
            rootMenus.push(menuNode);
          }
        });

        // 按 sort 排序
        const sortMenus = (menuArray: Menu[]) => {
          menuArray.sort((a, b) => (a.sort || 0) - (b.sort || 0));
          menuArray.forEach(menu => {
            if (menu.children && menu.children.length > 0) {
              sortMenus(menu.children);
            }
          });
        };

        sortMenus(rootMenus);
        setMenus(rootMenus);
      }
    } catch (error) {
      console.error('加载菜单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, []);

  // 监听菜单更新事件
  useEffect(() => {
    const handleMenuUpdate = () => {
      loadMenus();
    };

    window.addEventListener('menuUpdated', handleMenuUpdate);
    return () => {
      window.removeEventListener('menuUpdated', handleMenuUpdate);
    };
  }, []);

  return (
    <MenuContext.Provider value={{ menus, loading, refreshMenus: loadMenus }}>
      {children}
    </MenuContext.Provider>
  );
};
