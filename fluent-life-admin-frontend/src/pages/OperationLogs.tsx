import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import { FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface OperationLog {
  id: string;
  username: string;
  user_role: string;
  action: string;
  resource: string;
  resource_id: string;
  details: string;
  status: string;
  created_at: string;
}

const OperationLogs: React.FC = () => {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    status: '',
    username: '',
    start_date: '',
    end_date: '',
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLog, setDetailLog] = useState<OperationLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (filters.action) params.action = filters.action;
      if (filters.resource) params.resource = filters.resource;
      if (filters.status) params.status = filters.status;
      if (filters.username) params.username = filters.username;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await adminAPI.getOperationLogs(params);
      if (response.code === 0 && response.data) {
        setLogs(response.data.logs || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (log: OperationLog) => {
    setDetailLog(log);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    return status === 'Success' ? 'text-green-600' : 'text-red-600';
  };

  const columns = [
    {
      key: 'username',
      title: '管理员',
      render: (_: any, log: OperationLog) => (
        <span className="text-sm text-gray-900">{log.username}</span>
      ),
    },
    {
      key: 'action',
      title: '操作',
      render: (_: any, log: OperationLog) => (
        <span className="text-sm text-gray-900">{log.action}</span>
      ),
    },
    {
      key: 'resource',
      title: '资源类型',
      render: (_: any, log: OperationLog) => (
        <span className="text-sm text-gray-900">{log.resource}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (_: any, log: OperationLog) => (
        <span className={`text-sm font-medium ${getStatusColor(log.status)}`}>
          {log.status === 'Success' ? '成功' : '失败'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '操作时间',
      render: (_: any, log: OperationLog) => (
        <span className="text-sm text-gray-900">
          {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, log: OperationLog) => (
        <button
          onClick={() => handleView(log)}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          title="查看详情"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">操作日志</h1>
        <p className="mt-1 text-sm text-gray-500">查看管理员操作记录</p>
      </div>

      {/* 筛选区域 */}
      <Card shadow>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <input
            type="text"
            placeholder="操作类型"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <input
            type="text"
            placeholder="资源类型"
            value={filters.resource}
            onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">全部状态</option>
            <option value="Success">成功</option>
            <option value="Failure">失败</option>
          </select>
          <input
            type="text"
            placeholder="管理员用户名"
            value={filters.username}
            onChange={(e) => setFilters({ ...filters, username: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <input
            type="date"
            placeholder="开始日期"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <input
            type="date"
            placeholder="结束日期"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
      </Card>

      {/* 数据表格 */}
      <Card shadow>
        <Table
          columns={columns}
          dataSource={logs}
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

      {/* 详情模态框 */}
      {showDetailModal && detailLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">操作日志详情</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">管理员：</span>
                <span className="text-sm text-gray-900 ml-2">{detailLog.username}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">角色：</span>
                <span className="text-sm text-gray-900 ml-2">{detailLog.user_role}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">操作：</span>
                <span className="text-sm text-gray-900 ml-2">{detailLog.action}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">资源类型：</span>
                <span className="text-sm text-gray-900 ml-2">{detailLog.resource}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">资源ID：</span>
                <span className="text-sm text-gray-900 ml-2">{detailLog.resource_id || '无'}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">状态：</span>
                <span className={`text-sm font-medium ml-2 ${getStatusColor(detailLog.status)}`}>
                  {detailLog.status === 'Success' ? '成功' : '失败'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">操作时间：</span>
                <span className="text-sm text-gray-900 ml-2">
                  {format(new Date(detailLog.created_at), 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>
              {detailLog.details && (
                <div>
                  <span className="text-sm font-medium text-gray-700">详情：</span>
                  <p className="text-sm text-gray-900 mt-2 bg-gray-50 p-3 rounded">
                    {detailLog.details}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailLog(null);
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

export default OperationLogs;
