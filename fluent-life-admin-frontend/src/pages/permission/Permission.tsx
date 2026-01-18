import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import Input from '../../components/form/Input';
import FormItem from '../../components/form/FormItem';
import Textarea from '../../components/form/Textarea';
import { Role, Menu } from '../../types/index';
import { Plus, Edit, Trash2, Shield, List, X } from 'lucide-react';
import { format } from 'date-fns';
import { Column } from '../../components/common/Table';

const Permission: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'menus'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolePage, setRolePage] = useState(1);
  const [roleTotal, setRoleTotal] = useState(0);
  const [menuPage, setMenuPage] = useState(1);
  const [menuTotal, setMenuTotal] = useState(0);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  // 角色相关状态
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    permissions: [] as string[],
  });

  // 菜单相关状态
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    path: '',
    icon: '',
    parent_id: '',
    sort: 0,
  });

  useEffect(() => {
    if (activeTab === 'roles') {
      loadRoles();
    } else {
      loadMenus();
    }
  }, [rolePage, menuPage, activeTab]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getRoles({ page: rolePage, page_size: 20 });
      if (response.code === 0 && response.data) {
        // 将权限从JSONB对象转换为字符串数组
        const rolesWithPermissions = (response.data.roles || []).map((role: any) => ({
          ...role,
          permissions: role.permissions ? Object.keys(role.permissions) : [],
        }));
        setRoles(rolesWithPermissions);
        setRoleTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMenus = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getMenus({ page: menuPage, page_size: 20 });
      if (response.code === 0 && response.data) {
        setMenus(response.data.menus || []);
        // 后端返回的total是所有菜单的总数，但分页只对顶级菜单进行
        // 我们需要计算顶级菜单的总数
        setMenuTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载菜单列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenuExpand = (menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  // 角色操作
  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', code: '', description: '', permissions: [] });
    setShowRoleModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      code: role.code,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name || !roleForm.code) {
      alert('请填写角色名称和代码');
      return;
    }

    try {
      if (editingRole) {
        const response = await adminAPI.updateRole(editingRole.id, roleForm);
        if (response.code === 0) {
          setShowRoleModal(false);
          loadRoles();
        } else {
          alert(response.message || '更新失败');
        }
      } else {
        const response = await adminAPI.createRole(roleForm);
        if (response.code === 0) {
          setShowRoleModal(false);
          loadRoles();
        } else {
          alert(response.message || '创建失败');
        }
      }
    } catch (error) {
      console.error('保存角色失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('确定要删除这个角色吗？')) return;

    try {
      const response = await adminAPI.deleteRole(id);
      if (response.code === 0) {
        loadRoles();
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 菜单操作
  const handleCreateMenu = () => {
    setEditingMenu(null);
    setMenuForm({ name: '', path: '', icon: '', parent_id: '', sort: 0 });
    setShowMenuModal(true);
  };

  const handleEditMenu = (menu: Menu) => {
    setEditingMenu(menu);
    setMenuForm({
      name: menu.name,
      path: menu.path || '',
      icon: menu.icon || '',
      parent_id: menu.parent_id || '',
      sort: menu.sort || 0,
    });
    setShowMenuModal(true);
  };

  const handleSaveMenu = async () => {
    if (!menuForm.name) {
      alert('请填写菜单名称');
      return;
    }

    try {
      const formData = {
        ...menuForm,
        parent_id: menuForm.parent_id || undefined,
      };

      if (editingMenu) {
        const response = await adminAPI.updateMenu(editingMenu.id, formData);
        if (response.code === 0) {
          setShowMenuModal(false);
          loadMenus();
          // 触发菜单更新事件，通知 Sidebar 刷新
          window.dispatchEvent(new CustomEvent('menuUpdated'));
        } else {
          alert(response.message || '更新失败');
        }
      } else {
        const response = await adminAPI.createMenu(formData);
        if (response.code === 0) {
          setShowMenuModal(false);
          loadMenus();
          // 触发菜单更新事件，通知 Sidebar 刷新
          window.dispatchEvent(new CustomEvent('menuUpdated'));
        } else {
          alert(response.message || '创建失败');
        }
      }
    } catch (error) {
      console.error('保存菜单失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm('确定要删除这个菜单吗？')) return;

    try {
      const response = await adminAPI.deleteMenu(id);
      if (response.code === 0) {
        loadMenus();
        // 触发菜单更新事件，通知 Sidebar 刷新
        window.dispatchEvent(new CustomEvent('menuUpdated'));
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除菜单失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 权限处理（简化版，直接输入用逗号分隔）
  const handlePermissionsChange = (value: string) => {
    const permissions = value
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    setRoleForm(prev => ({ ...prev, permissions }));
  };

  const roleColumns: Column<Role>[] = [
    {
      key: 'name',
      title: '角色名称',
      dataIndex: 'name' as keyof Role,
    },
    {
      key: 'code',
      title: '角色代码',
      dataIndex: 'code' as keyof Role,
    },
    {
      key: 'description',
      title: '描述',
      dataIndex: 'description' as keyof Role,
      render: (value: string) => value || '-',
    },
    {
      key: 'permissions',
      title: '权限',
      render: (_: any, record: Role) => (
        <div className="flex flex-wrap gap-1">
          {record.permissions && record.permissions.length > 0 ? (
            record.permissions.map((perm) => (
              <span
                key={perm}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
              >
                {perm === '*' ? '全部权限' : perm}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">无权限</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      render: (_: any, record: Role) => (
        <span className="text-sm text-gray-900">
          {record.created_at ? format(new Date(record.created_at), 'yyyy-MM-dd HH:mm') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, record: Role) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditRole(record)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteRole(record.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const menuColumns: Column<Menu>[] = [
    {
      key: 'name',
      title: '菜单名称',
      render: (_: any, record: Menu) => {
        const hasChildren = record.children && record.children.length > 0;
        const isExpanded = expandedMenus.has(record.id);
        return (
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => toggleMenuExpand(record.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            )}
            {!hasChildren && <span className="w-4 h-4"></span>}
            <span className="font-medium">{record.name}</span>
          </div>
        );
      },
    },
    {
      key: 'path',
      title: '路径',
      render: (_: any, record: Menu) => (
        <span className="text-sm text-gray-600">{record.path || '-'}</span>
      ),
    },
    {
      key: 'icon',
      title: '图标',
      render: (_: any, record: Menu) => (
        <span className="text-sm text-gray-600">{record.icon || '-'}</span>
      ),
    },
    {
      key: 'sort',
      title: '排序',
      render: (_: any, record: Menu) => (
        <span className="text-sm text-gray-600">{record.sort}</span>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      render: (_: any, record: Menu) => (
        <span className="text-sm text-gray-900">
          {(record as any).created_at ? format(new Date((record as any).created_at), 'yyyy-MM-dd HH:mm') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, record: Menu) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditMenu(record)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteMenu(record.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">权限管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理系统角色和菜单权限</p>
        </div>
        <Button variant="primary" onClick={() => activeTab === 'roles' ? handleCreateRole() : handleCreateMenu()}>
          <Plus className="w-4 h-4 mr-2" />
          新增{activeTab === 'roles' ? '角色' : '菜单'}
        </Button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('roles');
            setRolePage(1);
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          角色管理
        </button>
        <button
          onClick={() => {
            setActiveTab('menus');
            setMenuPage(1);
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'menus'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="w-4 h-4 inline mr-2" />
          菜单管理
        </button>
      </div>

      <Card shadow>
        {activeTab === 'roles' ? (
          <Table
            columns={roleColumns}
            dataSource={roles}
            loading={loading}
            striped
            pagination={{
              current: rolePage,
              pageSize: 20,
              total: roleTotal,
              onChange: (newPage) => setRolePage(newPage),
            }}
          />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {menuColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {typeof col.title === 'string' ? col.title : col.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={menuColumns.length} className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                      </td>
                    </tr>
                  ) : menus.length === 0 ? (
                    <tr>
                      <td colSpan={menuColumns.length} className="px-6 py-4 text-center text-gray-500">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    menus.map((menu) => (
                      <React.Fragment key={menu.id}>
                        <tr className={loading ? 'opacity-50' : ''}>
                          {menuColumns.map((col) => (
                            <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">
                              {col.render ? col.render(null, menu) : (menu as any)[col.dataIndex as string]}
                            </td>
                          ))}
                        </tr>
                        {/* 展开显示子菜单 */}
                        {expandedMenus.has(menu.id) && menu.children && menu.children.length > 0 && (
                          <>
                            {menu.children.map((child) => (
                              <tr key={child.id} className="bg-gray-50">
                                {menuColumns.map((col) => (
                                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">
                                    {col.key === 'name' ? (
                                      <div className="flex items-center gap-2 pl-8">
                                        <span className="text-gray-400">└─</span>
                                        <span className="text-gray-700">{child.name}</span>
                                      </div>
                                    ) : col.key === 'path' ? (
                                      <span className="text-sm text-gray-600 pl-8">{child.path || '-'}</span>
                                    ) : col.key === 'icon' ? (
                                      <span className="text-sm text-gray-600 pl-8">{child.icon || '-'}</span>
                                    ) : col.key === 'sort' ? (
                                      <span className="text-sm text-gray-600 pl-8">{child.sort}</span>
                                    ) : col.key === 'created_at' ? (
                                      <span className="text-sm text-gray-900 pl-8">
                                        {(child as any).created_at ? format(new Date((child as any).created_at), 'yyyy-MM-dd HH:mm') : '-'}
                                      </span>
                                    ) : col.key === 'actions' ? (
                                      <div className="flex items-center gap-2 pl-8">
                                        <button
                                          onClick={() => handleEditMenu(child)}
                                          className="text-blue-600 hover:text-blue-700"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMenu(child.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="pl-8">{(child as any)[col.dataIndex as string]}</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* 分页 */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                共 <span className="font-medium">{menuTotal}</span> 条记录
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuPage(Math.max(1, menuPage - 1))}
                  disabled={menuPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-700">
                  第 {menuPage} 页 / 共 {Math.ceil(menuTotal / 20)} 页
                </span>
                <button
                  onClick={() => setMenuPage(Math.min(Math.ceil(menuTotal / 20), menuPage + 1))}
                  disabled={menuPage >= Math.ceil(menuTotal / 20)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 角色编辑弹窗 */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRole ? '编辑角色' : '新增角色'}
              </h2>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <FormItem label="角色名称" required>
                <Input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入角色名称"
                />
              </FormItem>
              <FormItem label="角色代码" required>
                <Input
                  value={roleForm.code}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="请输入角色代码（英文）"
                />
              </FormItem>
              <FormItem label="描述">
                <Textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请输入角色描述"
                  rows={3}
                />
              </FormItem>
              <FormItem label="权限">
                <Input
                  value={roleForm.permissions.join(', ')}
                  onChange={(e) => handlePermissionsChange(e.target.value)}
                  placeholder="请输入权限，用逗号分隔（如：user:read, user:write）"
                />
                <p className="text-xs text-gray-500 mt-1">多个权限用逗号分隔</p>
              </FormItem>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveRole}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 菜单编辑弹窗 */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMenu ? '编辑菜单' : '新增菜单'}
              </h2>
              <button
                onClick={() => setShowMenuModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <FormItem label="菜单名称" required>
                <Input
                  value={menuForm.name}
                  onChange={(e) => setMenuForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入菜单名称"
                />
              </FormItem>
              <FormItem label="路径">
                <Input
                  value={menuForm.path}
                  onChange={(e) => setMenuForm(prev => ({ ...prev, path: e.target.value }))}
                  placeholder="请输入菜单路径（如：/users）"
                />
              </FormItem>
              <FormItem label="图标">
                <Input
                  value={menuForm.icon}
                  onChange={(e) => setMenuForm(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="请输入图标名称"
                />
              </FormItem>
              <FormItem label="父菜单ID">
                <Input
                  value={menuForm.parent_id}
                  onChange={(e) => setMenuForm(prev => ({ ...prev, parent_id: e.target.value }))}
                  placeholder="父菜单ID（留空则为顶级菜单）"
                />
              </FormItem>
              <FormItem label="排序">
                <Input
                  type="number"
                  value={menuForm.sort}
                  onChange={(e) => setMenuForm(prev => ({ ...prev, sort: parseInt(e.target.value) || 0 }))}
                  placeholder="排序值，数字越小越靠前"
                />
              </FormItem>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowMenuModal(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveMenu}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Permission;
