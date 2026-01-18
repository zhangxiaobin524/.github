import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import AIRoleModal from './AIRoleModal';

interface AIRole {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  voice_type: string;
  enabled: boolean;
}

const AIRoles: React.FC = () => {
  const [roles, setRoles] = useState<AIRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<AIRole | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAIRoles();
      if (response.code === 0 && response.data) {
        setRoles(response.data.roles || []);
      }
    } catch (error) {
      console.error('加载AI角色失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: AIRole) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个角色吗？')) return;
    try {
      await adminAPI.deleteAIRole(id);
      loadRoles();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    loadRoles();
  };

  const handleInitFromConfig = async () => {
    if (!confirm('确定要从配置文件初始化角色吗？如果数据库中已有角色，会将配置文件中不存在的角色添加进去。')) return;
    try {
      setLoading(true);
      const response = await adminAPI.initAIRolesFromConfig();
      if (response.code === 0) {
        alert(response.message || '初始化成功');
        loadRoles();
      } else {
        alert(response.message || '初始化失败');
      }
    } catch (error: any) {
      console.error('初始化失败:', error);
      alert(error.response?.data?.message || '初始化失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  const togglePrompt = (id: string) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPrompts(newExpanded);
  };

  const columns = [
    {
      key: 'name',
      title: '角色信息',
      width: '20%',
      render: (_: any, item: AIRole) => (
        <div>
          <div className="font-semibold text-gray-900 mb-1">{item.name}</div>
          <div className="text-xs text-gray-500 font-mono mb-1 break-all">ID: {item.id}</div>
          {item.description && (
            <div className="text-sm text-gray-600 line-clamp-2">{item.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'system_prompt',
      title: '系统提示词',
      width: '35%',
      render: (_: any, item: AIRole) => {
        const isExpanded = expandedPrompts.has(item.id);
        const shouldTruncate = item.system_prompt && item.system_prompt.length > 100;
        return (
          <div>
            {item.system_prompt ? (
              <div className="text-sm text-gray-700">
                <div className={shouldTruncate && !isExpanded ? 'line-clamp-3' : 'break-words'}>
                  {item.system_prompt}
                </div>
                {shouldTruncate && (
                  <button
                    onClick={() => togglePrompt(item.id)}
                    className="text-blue-600 hover:text-blue-800 text-xs mt-1 underline"
                  >
                    {isExpanded ? '收起' : '展开全文'}
                  </button>
                )}
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'voice_type',
      title: '音色',
      width: '25%',
      render: (_: any, item: AIRole) => (
        <div>
          <span 
            className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded inline-block break-all"
            title={item.voice_type}
          >
            {item.voice_type || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'enabled',
      title: '状态',
      width: '8%',
      align: 'center' as const,
      render: (_: any, item: AIRole) => (
        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap inline-block ${
          item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {item.enabled ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '12%',
      align: 'center' as const,
      render: (_: any, item: AIRole) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI模拟角色管理</h1>
        <div className="flex gap-3">
          <Button onClick={handleInitFromConfig} variant="ghost" className="flex items-center gap-2">
            从配置文件初始化
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新增角色
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>提示：</strong>这里管理的角色会用于AI实战模拟功能。修改角色配置后，前台APP会自动获取最新的角色列表。
          </p>
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <Table
            columns={columns}
            dataSource={roles}
            loading={loading}
          />
        </div>
        {roles.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p>暂无角色数据，点击"新增角色"按钮添加</p>
          </div>
        )}
      </Card>

      {modalVisible && (
        <AIRoleModal
          visible={modalVisible}
          editingItem={editingItem}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default AIRoles;
