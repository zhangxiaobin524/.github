import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import { Plus, Edit, Eye } from 'lucide-react';
import LegalDocumentModal from './LegalDocumentModal';

interface LegalDocument {
  id: string;
  type: 'terms_of_service' | 'privacy_policy';
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const LegalDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<LegalDocument | null>(null);
  const [viewingItem, setViewingItem] = useState<LegalDocument | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getLegalDocuments();
      if (response.code === 0 && response.data) {
        setDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error('加载法律文档失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: LegalDocument) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleView = (item: LegalDocument) => {
    setViewingItem(item);
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    setViewingItem(null);
    loadDocuments();
  };

  const columns = [
    {
      key: 'type',
      title: '类型',
      dataIndex: 'type' as keyof LegalDocument,
      render: (value: string) => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {value === 'terms_of_service' ? '服务协议' : '隐私政策'}
        </span>
      ),
    },
    {
      key: 'title',
      title: '标题',
      dataIndex: 'title' as keyof LegalDocument,
    },
    {
      key: 'version',
      title: '版本',
      dataIndex: 'version' as keyof LegalDocument,
    },
    {
      key: 'is_active',
      title: '状态',
      dataIndex: 'is_active' as keyof LegalDocument,
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      title: '更新时间',
      dataIndex: 'updated_at' as keyof LegalDocument,
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, item: LegalDocument) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(item)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Eye className="w-4 h-4 mr-1" />
            查看
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            className="text-green-600 hover:text-green-700"
          >
            <Edit className="w-4 h-4 mr-1" />
            编辑
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">法律文档管理</h1>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新增文档
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={documents}
          loading={loading}
        />
      </Card>

      {modalVisible && (
        <LegalDocumentModal
          visible={modalVisible}
          editingItem={editingItem}
          viewingItem={viewingItem}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export default LegalDocuments;
