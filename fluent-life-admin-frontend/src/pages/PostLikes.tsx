import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import { Heart, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
  user?: {
    username: string;
  };
  post?: {
    content: string;
  };
}

const PostLikes: React.FC = () => {
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLikes, setSelectedLikes] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    post_id: '',
    user_id: '',
  });

  useEffect(() => {
    loadLikes();
  }, [page, filters]);

  const loadLikes = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (filters.post_id) params.post_id = filters.post_id;
      if (filters.user_id) params.user_id = filters.user_id;

      const response = await adminAPI.getPostLikes(params);
      if (response.code === 0 && response.data) {
        setLikes(response.data.likes || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载点赞列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`确定要删除这 ${ids.length} 条点赞记录吗？`)) {
      return;
    }
    try {
      const response = await adminAPI.deletePostLikesBatch(ids);
      if (response.code === 0) {
        alert('删除成功');
        loadLikes();
        setSelectedLikes([]);
      } else {
        alert('删除失败: ' + response.message);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const columns = [
    {
      key: 'checkbox',
      title: '',
      render: (_: any, like: PostLike) => (
        <input
          type="checkbox"
          checked={selectedLikes.includes(like.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedLikes([...selectedLikes, like.id]);
            } else {
              setSelectedLikes(selectedLikes.filter(id => id !== like.id));
            }
          }}
          className="w-4 h-4 text-blue-600 rounded"
        />
      ),
    },
    {
      key: 'user',
      title: '用户',
      render: (_: any, like: PostLike) => (
        <span className="text-sm text-gray-900">
          {like.user?.username || '未知用户'}
        </span>
      ),
    },
    {
      key: 'post',
      title: '帖子内容',
      render: (_: any, like: PostLike) => (
        <span className="text-sm text-gray-900 line-clamp-2 max-w-md">
          {like.post?.content?.substring(0, 50) || '未知帖子'}...
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '点赞时间',
      render: (_: any, like: PostLike) => (
        <span className="text-sm text-gray-900">
          {format(new Date(like.created_at), 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, like: PostLike) => (
        <button
          onClick={() => handleDelete([like.id])}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">点赞管理</h1>
        <p className="mt-1 text-sm text-gray-500">管理帖子点赞记录</p>
      </div>

      {/* 筛选区域 */}
      <Card shadow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="帖子ID"
            value={filters.post_id}
            onChange={(e) => setFilters({ ...filters, post_id: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <input
            type="text"
            placeholder="用户ID"
            value={filters.user_id}
            onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        {selectedLikes.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => handleDelete(selectedLikes)}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              批量删除 ({selectedLikes.length})
            </button>
          </div>
        )}
      </Card>

      {/* 数据表格 */}
      <Card shadow>
        <Table
          columns={columns}
          dataSource={likes}
          loading={loading}
          striped
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (newPage) => setPage(newPage),
          }}
        />
      </Card>
    </div>
  );
};

export default PostLikes;
