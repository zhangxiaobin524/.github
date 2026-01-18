import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import AppSettingModal from './AppSettingModal';

interface AppSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const AppSettings: React.FC = () => {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<AppSetting | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAppSettings();
      if (response.code === 0 && response.data) {
        setSettings(response.data.settings || []);
      }
    } catch (error) {
      console.error('加载应用设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: AppSetting) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个设置吗？')) return;
    try {
      await adminAPI.deleteAppSetting(id);
      loadSettings();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    loadSettings();
  };

  const columns = [
    {
      key: 'key',
      title: '键名',
      dataIndex: 'key' as keyof AppSetting,
      render: (value: string) => (
        <span className="font-mono text-sm font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'value',
      title: '值',
      dataIndex: 'value' as keyof AppSetting,
      render: (value: string) => (
        <span className="text-sm text-gray-700 max-w-md truncate block" title={value}>
          {value}
        </span>
      ),
    },
    {
      key: 'description',
      title: '描述',
      dataIndex: 'description' as keyof AppSetting,
      render: (value: string) => value || <span className="text-gray-400">-</span>,
    },
    {
      key: 'updated_at',
      title: '更新时间',
      dataIndex: 'updated_at' as keyof AppSetting,
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, item: AppSetting) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            className="text-green-600 hover:text-green-700"
          >
            <Edit className="w-4 h-4 mr-1" />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">应用设置管理</h1>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新增设置
        </Button>
      </div>

      <Card>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>提示：</strong>常用键名包括：<code>app_version</code>（版本号）、<code>about_us</code>（关于我们）、<code>release_notes</code>（更新说明）、<code>customer_service_email</code>（客服邮箱）等
          </p>
        </div>
        <Table
          columns={columns}
          dataSource={settings}
          loading={loading}
        />
      </Card>

      {modalVisible && (
        <AppSettingModal
          visible={modalVisible}
          editingItem={editingItem}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default AppSettings;
