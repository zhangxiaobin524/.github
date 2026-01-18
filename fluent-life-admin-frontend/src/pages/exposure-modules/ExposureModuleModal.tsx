import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Button from '../../components/form/Button';
import Input from '../../components/form/Input';
import Textarea from '../../components/form/Textarea';
import FormItem from '../../components/form/FormItem';
import Select from '../../components/form/Select';

interface ExposureModuleModalProps {
  visible: boolean;
  editingItem: any;
  onClose: () => void;
}

const ExposureModuleModal: React.FC<ExposureModuleModalProps> = ({
  visible,
  editingItem,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    icon: '',
    color: 'blue',
    display_order: 0,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        id: editingItem.id || '',
        title: editingItem.title || '',
        description: editingItem.description || '',
        icon: editingItem.icon || '',
        color: editingItem.color || 'blue',
        display_order: editingItem.display_order || 0,
        is_active: editingItem.is_active !== undefined ? editingItem.is_active : true,
      });
    } else {
      setFormData({
        id: '',
        title: '',
        description: '',
        icon: '',
        color: 'blue',
        display_order: 0,
        is_active: true,
      });
    }
  }, [editingItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.title || !formData.description || !formData.icon) {
      alert('请填写所有必填字段');
      return;
    }

    setLoading(true);
    try {
      if (editingItem) {
        const response = await adminAPI.updateExposureModule(editingItem.id, formData);
        if (response.code === 0) {
          alert('更新成功');
          onClose();
        } else {
          alert(response.message || '更新失败');
        }
      } else {
        const response = await adminAPI.createExposureModule(formData);
        if (response.code === 0) {
          alert('创建成功');
          onClose();
        } else {
          alert(response.message || '创建失败');
        }
      }
    } catch (error: any) {
      console.error('提交失败:', error);
      alert(error.response?.data?.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const colorOptions = [
    { value: 'blue', label: '蓝色' },
    { value: 'yellow', label: '黄色' },
    { value: 'purple', label: '紫色' },
    { value: 'red', label: '红色' },
    { value: 'green', label: '绿色' },
    { value: 'orange', label: '橙色' },
    { value: 'pink', label: '粉色' },
    { value: 'indigo', label: '靛蓝' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
          <h2 className="text-xl font-bold">
            {editingItem ? '编辑场景' : '添加场景'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormItem label="场景ID" required>
            <Input
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="例如: help-others"
              disabled={!!editingItem}
            />
            <p className="text-xs text-gray-500 mt-1">
              使用英文小写和连字符，创建后不可修改
            </p>
          </FormItem>

          <FormItem label="标题" required>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例如: 帮助别人"
            />
          </FormItem>

          <FormItem label="描述" required>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="例如: 主动帮助他人，建立自信和社交连接"
              rows={3}
            />
          </FormItem>

          <FormItem label="图标" required>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="例如: 🤝"
            />
            <p className="text-xs text-gray-500 mt-1">
              输入一个emoji表情
            </p>
          </FormItem>

          <FormItem label="颜色" required>
            <Select
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              options={colorOptions}
            />
          </FormItem>

          <FormItem label="排序">
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              placeholder="数字越小越靠前"
            />
          </FormItem>

          <FormItem label="状态">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">启用</span>
            </div>
          </FormItem>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" loading={loading}>
              {editingItem ? '更新' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExposureModuleModal;
