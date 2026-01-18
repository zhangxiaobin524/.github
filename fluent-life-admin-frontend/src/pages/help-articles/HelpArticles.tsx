import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import HelpArticleModal from './HelpArticleModal';

interface HelpArticle {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HelpCategory {
  id: string;
  name: string;
}

const HelpArticles: React.FC = () => {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<HelpArticle | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  useEffect(() => {
    loadCategories();
    loadArticles();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await adminAPI.getHelpCategories();
      if (response.code === 0 && response.data) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadArticles = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategoryId) params.category_id = selectedCategoryId;
      if (searchKeyword) params.q = searchKeyword;
      const response = await adminAPI.getHelpArticles(params);
      if (response.code === 0 && response.data) {
        setArticles(response.data.articles || []);
      }
    } catch (error) {
      console.error('加载帮助文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, [selectedCategoryId, searchKeyword]);

  const handleCreate = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: HelpArticle) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await adminAPI.deleteHelpArticle(id);
      loadArticles();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    loadArticles();
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || '未知分类';
  };

  const columns = [
    {
      key: 'category_id',
      title: '分类',
      dataIndex: 'category_id' as keyof HelpArticle,
      render: (value: string) => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {getCategoryName(value)}
        </span>
      ),
    },
    {
      key: 'question',
      title: '问题',
      dataIndex: 'question' as keyof HelpArticle,
    },
    {
      key: 'order',
      title: '排序',
      dataIndex: 'order' as keyof HelpArticle,
    },
    {
      key: 'is_active',
      title: '状态',
      dataIndex: 'is_active' as keyof HelpArticle,
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      title: '更新时间',
      dataIndex: 'updated_at' as keyof HelpArticle,
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, item: HelpArticle) => (
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
        <h1 className="text-2xl font-bold text-gray-900">帮助文章管理</h1>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新增文章
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索问题或答案..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <Table
          columns={columns}
          dataSource={articles}
          loading={loading}
        />
      </Card>

      {modalVisible && (
        <HelpArticleModal
          visible={modalVisible}
          editingItem={editingItem}
          categories={categories}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default HelpArticles;
