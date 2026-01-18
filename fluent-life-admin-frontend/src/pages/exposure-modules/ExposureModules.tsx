import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Button from '../../components/form/Button';
import { Plus, Edit, Trash2, List, GripVertical } from 'lucide-react';
import ExposureModuleModal from './ExposureModuleModal';
import ExposureStepsModal from './ExposureStepsModal';

interface ExposureModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  steps?: any[];
}

const ExposureModules: React.FC = () => {
  const [modules, setModules] = useState<ExposureModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [stepsModalVisible, setStepsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ExposureModule | null>(null);
  const [selectedModule, setSelectedModule] = useState<ExposureModule | null>(null);
  const [keyword, setKeyword] = useState('');
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [dragOverModuleId, setDragOverModuleId] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, [page, keyword]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (keyword) params.keyword = keyword;

      const response = await adminAPI.getExposureModules(params);
      console.log('脱敏练习API响应:', response);
      if (response.code === 0 && response.data) {
        console.log('脱敏练习数据:', response.data);
        // 按 display_order 排序
        const sortedModules = (response.data.modules || []).sort((a: ExposureModule, b: ExposureModule) => 
          a.display_order - b.display_order
        );
        setModules(sortedModules);
        setTotal(response.data.total || 0);
      } else {
        console.warn('脱敏练习API响应异常:', response);
      }
    } catch (error) {
      console.error('加载脱敏练习场景失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, moduleId: string) => {
    setDraggedModuleId(moduleId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', moduleId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedModuleId(null);
    setDragOverModuleId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedModuleId && draggedModuleId !== targetModuleId) {
      setDragOverModuleId(targetModuleId);
    }
  };

  const handleDragLeave = () => {
    setDragOverModuleId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    
    if (!draggedModuleId || draggedModuleId === targetModuleId) {
      return;
    }

    // 重新排序模块
    const draggedIndex = modules.findIndex(m => m.id === draggedModuleId);
    const targetIndex = modules.findIndex(m => m.id === targetModuleId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // 创建新的模块数组
    const newModules = [...modules];
    const [draggedModule] = newModules.splice(draggedIndex, 1);
    newModules.splice(targetIndex, 0, draggedModule);

    // 更新本地状态（立即更新UI）
    setModules(newModules);

    // 更新模块顺序
    const updatedModules = newModules.map((module, index) => ({
      id: module.id,
      order: index + 1,
    }));

    try {
      const response = await adminAPI.batchUpdateModulesOrder(updatedModules);
      if (response.code === 0) {
        // 更新本地状态的 display_order
        setModules(newModules.map((module, index) => ({
          ...module,
          display_order: index + 1,
        })));
      } else {
        // 如果更新失败，恢复原顺序
        loadModules();
        alert(response.message || '更新顺序失败');
      }
    } catch (error) {
      console.error('更新模块顺序失败:', error);
      // 如果更新失败，恢复原顺序
      loadModules();
      alert('更新顺序失败，请重试');
    }

    setDraggedModuleId(null);
    setDragOverModuleId(null);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleEdit = (item: ExposureModule) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleManageSteps = (item: ExposureModule) => {
    setSelectedModule(item);
    setStepsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个场景吗？此操作不可恢复！')) return;
    try {
      const response = await adminAPI.deleteExposureModule(id);
      if (response.code === 0) {
        loadModules();
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除场景失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    loadModules();
  };

  const handleStepsModalClose = () => {
    setStepsModalVisible(false);
    setSelectedModule(null);
    loadModules();
  };

  const columns = [
    {
      key: 'drag',
      title: '',
      width: '40px',
      render: (_: any, record: ExposureModule) => (
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="text-gray-400" size={18} />
        </div>
      ),
    },
    {
      key: 'icon',
      title: '图标',
      dataIndex: 'icon' as keyof ExposureModule,
      render: (value: string) => (
        <span className="text-2xl">{value}</span>
      ),
    },
    {
      key: 'title',
      title: '标题',
      dataIndex: 'title' as keyof ExposureModule,
    },
    {
      key: 'description',
      title: '描述',
      dataIndex: 'description' as keyof ExposureModule,
      render: (value: string) => (
        <div className="max-w-md truncate" title={value}>
          {value}
        </div>
      ),
    },
    {
      key: 'color',
      title: '颜色',
      dataIndex: 'color' as keyof ExposureModule,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded bg-${value}-500`}></div>
          <span className="text-sm">{value}</span>
        </div>
      ),
    },
    {
      key: 'display_order',
      title: '排序',
      dataIndex: 'display_order' as keyof ExposureModule,
    },
    {
      key: 'steps_count',
      title: '步骤数',
      render: (_: any, record: ExposureModule) => (
        <span>{record.steps?.length || 0}</span>
      ),
    },
    {
      key: 'is_active',
      title: '状态',
      dataIndex: 'is_active' as keyof ExposureModule,
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
      render: (_: any, record: ExposureModule) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleManageSteps(record)}
            className="text-purple-600 hover:text-purple-800"
            title="管理步骤"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => handleEdit(record)}
            className="text-blue-600 hover:text-blue-800"
            title="编辑"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(record.id)}
            className="text-red-600 hover:text-red-800"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">脱敏练习场景管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理脱敏练习的场景和步骤配置</p>
        </div>
        <Button onClick={handleAdd} icon={<Plus size={16} />}>
          添加场景
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="搜索场景标题或描述..."
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            拖拽行可调整顺序
          </p>
        </div>

        <Table
          columns={columns}
          dataSource={modules}
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
          }}
          rowKey="id"
          onRow={(record) => ({
            draggable: true,
            onDragStart: (e: React.DragEvent) => handleDragStart(e, record.id),
            onDragEnd: handleDragEnd,
            onDragOver: (e: React.DragEvent) => handleDragOver(e, record.id),
            onDragLeave: handleDragLeave,
            onDrop: (e: React.DragEvent) => handleDrop(e, record.id),
            className: `cursor-move ${
              draggedModuleId === record.id 
                ? 'opacity-50 bg-gray-100' 
                : dragOverModuleId === record.id
                ? 'border-l-4 border-blue-500 bg-blue-50'
                : ''
            }`,
          })}
        />
      </Card>

      {modalVisible && (
        <ExposureModuleModal
          visible={modalVisible}
          editingItem={editingItem}
          onClose={handleModalClose}
        />
      )}

      {stepsModalVisible && selectedModule && (
        <ExposureStepsModal
          visible={stepsModalVisible}
          module={selectedModule}
          onClose={handleStepsModalClose}
        />
      )}
    </div>
  );
};

export default ExposureModules;
