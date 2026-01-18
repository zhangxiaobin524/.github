import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import HelpCategoryModal from './HelpCategoryModal';

interface HelpCategory {
  id: string;
  name: string;
  order: number;
  created_at: string;
  updated_at: string;
}

const HelpCategories: React.FC = () => {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<HelpCategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getHelpCategories({ with_articles: false });
      if (response.code === 0 && response.data) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('加载帮助分类失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: HelpCategory) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？删除后该分类下的所有文章也会被删除。')) return;
    try {
      await adminAPI.deleteHelpCategory(id);
      loadCategories();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    loadCategories();
  };

  const columns = [
    {
      key: 'name',
      title: '分类名称',
      dataIndex: 'name' as keyof HelpCategory,
    },
    {
      key: 'order',
      title: '排序',
      dataIndex: 'order' as keyof HelpCategory,
    },
    {
      key: 'updated_at',
      title: '更新时间',
      dataIndex: 'updated_at' as keyof HelpCategory,
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, item: HelpCategory) => (
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
        <h1 className="text-2xl font-bold text-gray-900">帮助分类管理</h1>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新增分类
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={categories}
          loading={loading}
        />
      </Card>

      {modalVisible && (
        <HelpCategoryModal
          visible={modalVisible}
          editingItem={editingItem}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default HelpCategories;
