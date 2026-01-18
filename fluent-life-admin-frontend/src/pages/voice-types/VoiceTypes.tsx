import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import VoiceTypeModal from './VoiceTypeModal';

interface VoiceType {
  id: string;
  name: string;
  type: string;
  description: string;
  enabled: boolean;
}

const VoiceTypes: React.FC = () => {
  const [voiceTypes, setVoiceTypes] = useState<VoiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<VoiceType | null>(null);

  useEffect(() => {
    loadVoiceTypes();
  }, []);

  const loadVoiceTypes = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getVoiceTypes();
      if (response.code === 0 && response.data) {
        setVoiceTypes(response.data.voice_types || []);
      }
    } catch (error) {
      console.error('加载音色类型失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: VoiceType) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个音色类型吗？')) return;
    try {
      await adminAPI.deleteVoiceType(id);
      loadVoiceTypes();
    } catch (error: any) {
      console.error('删除失败:', error);
      alert(error.response?.data?.message || '删除失败，请重试');
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    loadVoiceTypes();
  };

  const columns = [
    {
      key: 'name',
      title: '音色名称',
      dataIndex: 'name' as keyof VoiceType,
      render: (value: string) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'type',
      title: '音色类型',
      dataIndex: 'type' as keyof VoiceType,
      render: (value: string) => (
        <span className="font-mono text-sm text-gray-700">{value}</span>
      ),
    },
    {
      key: 'description',
      title: '描述',
      dataIndex: 'description' as keyof VoiceType,
      render: (value: string) => value || <span className="text-gray-400">-</span>,
    },
    {
      key: 'enabled',
      title: '状态',
      dataIndex: 'enabled' as keyof VoiceType,
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, item: VoiceType) => (
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
        <h1 className="text-2xl font-bold text-gray-900">音色管理</h1>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新增音色
        </Button>
      </div>

      <Card>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>提示：</strong>这里管理的音色类型会用于AI角色配置。在创建或编辑AI角色时，可以从这里选择已启用的音色类型。
          </p>
        </div>
        <Table
          columns={columns}
          dataSource={voiceTypes}
          loading={loading}
        />
      </Card>

      {modalVisible && (
        <VoiceTypeModal
          visible={modalVisible}
          editingItem={editingItem}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default VoiceTypes;
