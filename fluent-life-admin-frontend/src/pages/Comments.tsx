import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import { MessageSquare, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
  };
  post?: {
    content: string;
  };
}

const Comments: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    post_id: '',
    user_id: '',
    keyword: '',
  });
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailComment, setDetailComment] = useState<Comment | null>(null);

  useEffect(() => {
    loadComments();
  }, [page, filters]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (filters.post_id) params.post_id = filters.post_id;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.keyword) params.keyword = filters.keyword;

      const response = await adminAPI.getComments(params);
      if (response.code === 0 && response.data) {
        setComments(response.data.comments || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setShowEditModal(true);
  };

  const handleView = async (comment: Comment) => {
    try {
      const response = await adminAPI.getComment(comment.id);
      if (response.code === 0) {
        setDetailComment(response.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('获取详情失败:', error);
      alert('获取详情失败');
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`确定要删除这 ${ids.length} 条评论吗？`)) {
      return;
    }
    try {
      const response = await adminAPI.deleteCommentsBatch(ids);
      if (response.code === 0) {
        alert('删除成功');
        loadComments();
        setSelectedComments([]);
      } else {
        alert('删除失败: ' + response.message);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingComment) return;
    try {
      const response = await adminAPI.updateComment(editingComment.id, {
        content: editingComment.content,
      });
      if (response.code === 0) {
        alert('更新成功');
        setShowEditModal(false);
        setEditingComment(null);
        loadComments();
      } else {
        alert('更新失败: ' + response.message);
      }
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败');
    }
  };

  const columns = [
    {
      key: 'checkbox',
      title: '',
      render: (_: any, comment: Comment) => (
        <input
          type="checkbox"
          checked={selectedComments.includes(comment.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedComments([...selectedComments, comment.id]);
            } else {
              setSelectedComments(selectedComments.filter(id => id !== comment.id));
            }
          }}
          className="w-4 h-4 text-blue-600 rounded"
        />
      ),
    },
    {
      key: 'content',
      title: '评论内容',
      render: (_: any, comment: Comment) => (
        <span className="text-sm text-gray-900 line-clamp-2 max-w-md">
          {comment.content}
        </span>
      ),
    },
    {
      key: 'user',
      title: '用户',
      render: (_: any, comment: Comment) => (
        <span className="text-sm text-gray-900">
          {comment.user?.username || '未知用户'}
        </span>
      ),
    },
    {
      key: 'likes_count',
      title: '点赞数',
      render: (_: any, comment: Comment) => (
        <span className="text-sm text-gray-900">{comment.likes_count || 0}</span>
      ),
    },
    {
      key: 'created_at',
      title: '发布时间',
      render: (_: any, comment: Comment) => (
        <span className="text-sm text-gray-900">
          {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, comment: Comment) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(comment)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(comment)}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete([comment.id])}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">评论管理</h1>
        <p className="mt-1 text-sm text-gray-500">管理用户评论</p>
      </div>

      {/* 筛选区域 */}
      <Card shadow>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
          <input
            type="text"
            placeholder="搜索评论内容"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
        {selectedComments.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => handleDelete(selectedComments)}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              批量删除 ({selectedComments.length})
            </button>
          </div>
        )}
      </Card>

      {/* 数据表格 */}
      <Card shadow>
        <Table
          columns={columns}
          dataSource={comments}
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

      {/* 编辑模态框 */}
      {showEditModal && editingComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">编辑评论</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">评论内容</label>
                <textarea
                  value={editingComment.content}
                  onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={5}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingComment(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {showDetailModal && detailComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">评论详情</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">用户：</span>
                <span className="text-sm text-gray-900 ml-2">{detailComment.user?.username || '未知用户'}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">评论内容：</span>
                <p className="text-sm text-gray-900 mt-2 bg-gray-50 p-3 rounded">
                  {detailComment.content}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">点赞数：</span>
                <span className="text-sm text-gray-900 ml-2">{detailComment.likes_count || 0}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">发布时间：</span>
                <span className="text-sm text-gray-900 ml-2">
                  {format(new Date(detailComment.created_at), 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailComment(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comments;
