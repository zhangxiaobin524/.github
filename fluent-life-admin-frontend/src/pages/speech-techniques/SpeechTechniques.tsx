import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import SpeechTechniqueModal from './SpeechTechniqueModal';

interface SpeechTechnique {
  id: string;
  name: string;
  icon: string;
  description: string;
  tips: string; // JSON字符串数组
  practice_texts: string; // JSON字符串数组
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SpeechTechniques: React.FC = () => {
  const [techniques, setTechniques] = useState<SpeechTechnique[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<SpeechTechnique | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadTechniques();
  }, [page, keyword]);

  const loadTechniques = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (keyword) params.keyword = keyword;

      const response = await adminAPI.getSpeechTechniques(params);
      console.log('语音技巧接口返回:', response);
      if (response.code === 0 && response.data) {
        console.log('techniques 数据:', response.data.techniques);
        console.log('total 数据:', response.data.total);
        setTechniques(response.data.techniques || []);
        setTotal(response.data.total || 0);
      } else {
        console.warn('接口返回异常:', response);
      }
    } catch (error) {
      console.error('加载语音技巧失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: SpeechTechnique) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`确定要删除这${ids.length}个语音技巧吗？此操作不可恢复！`)) return;
    try {
      const response = await adminAPI.deleteSpeechTechniquesBatch(ids);
      if (response.code === 0) {
        loadTechniques();
        setSelectedIds([]);
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除语音技巧失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    loadTechniques();
  };

  const columns = [
    {
      key: 'icon',
      title: '图标',
      render: (_: any, record: SpeechTechnique) => (
        <span className="text-2xl">{record.icon || '🎯'}</span>
      ),
    },
    {
      key: 'name',
      title: '名称',
      dataIndex: 'name' as keyof SpeechTechnique,
    },
    {
      key: 'description',
      title: '描述',
      dataIndex: 'description' as keyof SpeechTechnique,
      render: (value: string) => (
        <div className="max-w-md truncate" title={value}>
          {value || '-'}
        </div>
      ),
    },
    {
      key: 'order',
      title: '排序',
      dataIndex: 'order' as keyof SpeechTechnique,
    },
    {
      key: 'is_active',
      title: '状态',
      dataIndex: 'is_active' as keyof SpeechTechnique,
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {value ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, record: SpeechTechnique) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(record)}
            className="text-blue-600 hover:text-blue-800"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete([record.id])}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">语音技巧训练管理</h1>
          <Button onClick={handleAdd} icon={<Plus size={16} />}>
            新增语音技巧
          </Button>
        </div>

        <div className="mb-4 flex gap-4">
          <input
            type="text"
            placeholder="搜索名称或描述..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="px-4 py-2 border rounded-lg flex-1"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">已选择 {selectedIds.length} 项</span>
            <Button
              onClick={() => handleDelete(selectedIds)}
              variant="danger"
              size="sm"
            >
              批量删除
            </Button>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={techniques}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </Card>

      <SpeechTechniqueModal
        visible={modalVisible}
        editingItem={editingItem}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default SpeechTechniques;
