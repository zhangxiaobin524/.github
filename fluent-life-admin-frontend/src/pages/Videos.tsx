import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import { Search, Video, ExternalLink, Trash2, X, Play } from 'lucide-react';
import { format } from 'date-fns';
import { Column } from '../components/common/Table';

interface VideoItem {
  id: string;
  video_url: string;
  user_id: string;
  username: string;
  source: string; // 'exposure_module' | 'community_post'
  source_detail: string;
  module_id?: string;
  module_title?: string;
  post_id?: string;
  post_title?: string;
  created_at: string;
  duration?: number;
}

const Videos: React.FC = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    source: '',
    userId: '',
    moduleId: '',
  });
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);

  useEffect(() => {
    loadVideos();
  }, [page, filters]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (filters.source) params.source = filters.source;
      if (filters.userId) params.user_id = filters.userId;
      if (filters.moduleId) params.module_id = filters.moduleId;

      const response = await adminAPI.getVideos(params);
      if (response.code === 0 && response.data) {
        setVideos(response.data.videos || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载视频列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleDeleteVideo = async (id: string, source: string) => {
    if (!confirm('确定要删除这个视频吗？此操作不可恢复！')) return;

    try {
      const response = await adminAPI.deleteVideo(id, source);
      if (response.code === 0) {
        loadVideos();
        setSelectedVideoIds([]);
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除视频失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedVideoIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedVideoIds.length} 个视频吗？此操作不可恢复！`)) return;

    try {
      const videoIds = videos
        .filter(v => selectedVideoIds.includes(v.id))
        .map(v => ({ id: v.id, source: v.source }));
      
      const response = await adminAPI.batchDeleteVideos(videoIds);
      if (response.code === 0) {
        loadVideos();
        setSelectedVideoIds([]);
      } else {
        alert(response.message || '批量删除失败');
      }
    } catch (error) {
      console.error('批量删除视频失败:', error);
      alert('批量删除失败，请重试');
    }
  };

  const handleSelectVideo = (id: string) => {
    setSelectedVideoIds(prev =>
      prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedVideoIds(videos.map(v => v.id));
    } else {
      setSelectedVideoIds([]);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSourceBadge = (source: string, sourceDetail: string) => {
    if (source === 'exposure_module') {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
          {sourceDetail}
        </span>
      );
    } else if (source === 'community_post') {
      return (
        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
          {sourceDetail}
        </span>
      );
    }
    return null;
  };

  const columns: Column<VideoItem>[] = [
    {
      key: 'selection',
      title: (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedVideoIds.length === videos.length && videos.length > 0}
          onChange={handleSelectAll}
        />
      ),
      render: (_: any, record: VideoItem) => (
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-blue-600"
          checked={selectedVideoIds.includes(record.id)}
          onChange={() => handleSelectVideo(record.id)}
        />
      ),
      width: '50px',
    },
    {
      key: 'video',
      title: '视频',
      render: (_: any, record: VideoItem) => (
        <div className="flex items-center gap-3">
          <div className="relative w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
            <video
              src={record.video_url}
              className="w-full h-full object-cover"
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <Video className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayingVideo(record);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 truncate"
              >
                <Play className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">播放视频</span>
              </button>
              <a
                href={record.video_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                title="在新标签页打开"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
            <div className="text-xs text-gray-500 mt-1 truncate">
              ID: {record.id.substring(0, 8)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'user',
      title: '用户',
      render: (_: any, record: VideoItem) => (
        <div>
          <div className="text-sm text-gray-900">{record.username || '未知用户'}</div>
          <div className="text-xs text-gray-500">{record.user_id.substring(0, 8)}...</div>
        </div>
      ),
    },
    {
      key: 'source',
      title: '来源',
      render: (_: any, record: VideoItem) => (
        <div className="space-y-1">
          {getSourceBadge(record.source, record.source_detail)}
          {record.module_title && (
            <div className="text-xs text-gray-600 mt-1">
              模块: {record.module_title}
            </div>
          )}
          {record.post_title && (
            <div className="text-xs text-gray-600 mt-1 truncate max-w-xs">
              帖子: {record.post_title}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      title: '时长',
      render: (_: any, record: VideoItem) => (
        <span className="text-sm text-gray-900">{formatDuration(record.duration)}</span>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      render: (_: any, record: VideoItem) => (
        <span className="text-sm text-gray-900">
          {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, record: VideoItem) => (
        <button
          onClick={() => handleDeleteVideo(record.id, record.source)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">视频管理</h1>
        <p className="mt-1 text-sm text-gray-500">查看和管理所有用户上传的视频</p>
      </div>

      <Card shadow>
        {/* 筛选器 */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">来源</label>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="exposure_module">脱敏练习</option>
              <option value="community_post">感悟广场</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="输入用户ID"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">模块ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.moduleId}
                onChange={(e) => handleFilterChange('moduleId', e.target.value)}
                placeholder="输入模块ID"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 统计信息和操作 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            共 <span className="font-semibold text-gray-900">{total}</span> 个视频
            {selectedVideoIds.length > 0 && (
              <span className="ml-2 text-blue-600">已选中 {selectedVideoIds.length} 个</span>
            )}
          </div>
          <div className="flex gap-2">
            {selectedVideoIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
              >
                批量删除 ({selectedVideoIds.length})
              </button>
            )}
            <button
              onClick={loadVideos}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              刷新
            </button>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={videos}
          loading={loading}
          striped
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (newPage) => {
              setPage(newPage);
              setSelectedVideoIds([]);
            },
          }}
        />
      </Card>

      {/* 视频播放弹窗 */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setPlayingVideo(null)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">播放视频</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {playingVideo.username} • {format(new Date(playingVideo.created_at), 'yyyy-MM-dd HH:mm')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={playingVideo.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded flex items-center gap-1 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                  新标签页打开
                </a>
                <button
                  onClick={() => setPlayingVideo(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 视频播放区域 */}
            <div className="flex-1 p-4 overflow-auto">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  src={playingVideo.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('视频加载失败:', e);
                    alert('视频加载失败，请检查视频URL');
                  }}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>

              {/* 视频信息 */}
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium">视频ID:</span>
                  <span className="font-mono">{playingVideo.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">来源:</span>
                  {getSourceBadge(playingVideo.source, playingVideo.source_detail)}
                </div>
                {playingVideo.duration && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">时长:</span>
                    <span>{formatDuration(playingVideo.duration)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">视频URL:</span>
                  <a
                    href={playingVideo.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 truncate max-w-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {playingVideo.video_url}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Videos;
