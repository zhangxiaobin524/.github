import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import { UserPlus, Heart, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Follow {
  id: string;
  follower_id: string;
  followee_id: string;
  created_at: string;
  follower?: {
    username: string;
  };
  followee?: {
    username: string;
  };
}

interface PostCollection {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  user?: {
    username: string;
  };
  post?: {
    content: string;
  };
}

const FollowsCollections: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'follows' | 'collections'>('follows');
  const [follows, setFollows] = useState<Follow[]>([]);
  const [collections, setCollections] = useState<PostCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedFollows, setSelectedFollows] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    follower_id: '',
    followee_id: '',
    user_id: '',
    post_id: '',
  });

  useEffect(() => {
    if (activeTab === 'follows') {
      loadFollows();
    } else {
      loadCollections();
    }
  }, [page, filters, activeTab]);

  const loadFollows = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (filters.follower_id) params.follower_id = filters.follower_id;
      if (filters.followee_id) params.followee_id = filters.followee_id;

      const response = await adminAPI.getFollows(params);
      if (response.code === 0 && response.data) {
        setFollows(response.data.follows || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载关注列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.post_id) params.post_id = filters.post_id;

      const response = await adminAPI.getPostCollections(params);
      if (response.code === 0 && response.data) {
        setCollections(response.data.collections || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载收藏列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFollows = async (ids: string[]) => {
    if (!confirm(`确定要删除这 ${ids.length} 条关注关系吗？`)) {
      return;
    }
    try {
      const response = await adminAPI.deleteFollowsBatch(ids);
      if (response.code === 0) {
        alert('删除成功');
        loadFollows();
        setSelectedFollows([]);
      } else {
        alert('删除失败: ' + response.message);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const handleDeleteCollections = async (ids: string[]) => {
    if (!confirm(`确定要删除这 ${ids.length} 条收藏记录吗？`)) {
      return;
    }
    try {
      const response = await adminAPI.deletePostCollectionsBatch(ids);
      if (response.code === 0) {
        alert('删除成功');
        loadCollections();
        setSelectedCollections([]);
      } else {
        alert('删除失败: ' + response.message);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const followColumns = [
    {
      key: 'checkbox',
      title: '',
      render: (_: any, follow: Follow) => (
        <input
          type="checkbox"
          checked={selectedFollows.includes(follow.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedFollows([...selectedFollows, follow.id]);
            } else {
              setSelectedFollows(selectedFollows.filter(id => id !== follow.id));
            }
          }}
          className="w-4 h-4 text-blue-600 rounded"
        />
      ),
    },
    {
      key: 'follower',
      title: '关注者',
      render: (_: any, follow: Follow) => (
        <span className="text-sm text-gray-900">
          {follow.follower?.username || '未知用户'}
        </span>
      ),
    },
    {
      key: 'followee',
      title: '被关注者',
      render: (_: any, follow: Follow) => (
        <span className="text-sm text-gray-900">
          {follow.followee?.username || '未知用户'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '关注时间',
      render: (_: any, follow: Follow) => (
        <span className="text-sm text-gray-900">
          {format(new Date(follow.created_at), 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, follow: Follow) => (
        <button
          onClick={() => handleDeleteFollows([follow.id])}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const collectionColumns = [
    {
      key: 'checkbox',
      title: '',
      render: (_: any, collection: PostCollection) => (
        <input
          type="checkbox"
          checked={selectedCollections.includes(collection.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCollections([...selectedCollections, collection.id]);
            } else {
              setSelectedCollections(selectedCollections.filter(id => id !== collection.id));
            }
          }}
          className="w-4 h-4 text-blue-600 rounded"
        />
      ),
    },
    {
      key: 'user',
      title: '用户',
      render: (_: any, collection: PostCollection) => (
        <span className="text-sm text-gray-900">
          {collection.user?.username || '未知用户'}
        </span>
      ),
    },
    {
      key: 'post',
      title: '帖子内容',
      render: (_: any, collection: PostCollection) => (
        <span className="text-sm text-gray-900 line-clamp-2 max-w-md">
          {collection.post?.content?.substring(0, 50) || '未知帖子'}...
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '收藏时间',
      render: (_: any, collection: PostCollection) => (
        <span className="text-sm text-gray-900">
          {format(new Date(collection.created_at), 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, collection: PostCollection) => (
        <button
          onClick={() => handleDeleteCollections([collection.id])}
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
        <h1 className="text-2xl font-semibold text-gray-900">关注/收藏管理</h1>
        <p className="mt-1 text-sm text-gray-500">管理用户关注关系和收藏记录</p>
      </div>

      {/* 标签页 */}
      <Card shadow>
        <div className="border-b border-gray-200 mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('follows');
                setPage(1);
              }}
              className={`px-4 py-2 border-b-2 ${
                activeTab === 'follows'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              关注关系
            </button>
            <button
              onClick={() => {
                setActiveTab('collections');
                setPage(1);
              }}
              className={`px-4 py-2 border-b-2 ${
                activeTab === 'collections'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              <Heart className="w-4 h-4 inline mr-2" />
              收藏记录
            </button>
          </div>
        </div>

        {/* 筛选区域 */}
        <div className="mb-4">
          {activeTab === 'follows' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="关注者ID"
                value={filters.follower_id}
                onChange={(e) => setFilters({ ...filters, follower_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                placeholder="被关注者ID"
                value={filters.followee_id}
                onChange={(e) => setFilters({ ...filters, followee_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="用户ID"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                placeholder="帖子ID"
                value={filters.post_id}
                onChange={(e) => setFilters({ ...filters, post_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
          {activeTab === 'follows' && selectedFollows.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => handleDeleteFollows(selectedFollows)}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                批量删除 ({selectedFollows.length})
              </button>
            </div>
          )}
          {activeTab === 'collections' && selectedCollections.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => handleDeleteCollections(selectedCollections)}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                批量删除 ({selectedCollections.length})
              </button>
            </div>
          )}
        </div>

        {/* 数据表格 */}
        <Table
          columns={activeTab === 'follows' ? followColumns : collectionColumns}
          dataSource={activeTab === 'follows' ? follows : collections}
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

export default FollowsCollections;
