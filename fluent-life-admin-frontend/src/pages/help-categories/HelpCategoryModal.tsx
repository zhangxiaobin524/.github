import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Button from '../../components/form/Button';
import FormItem from '../../components/form/FormItem';
import Input from '../../components/form/Input';

interface HelpCategory {
  id?: string;
  name: string;
  order: number;
}

interface Props {
  visible: boolean;
  editingItem: HelpCategory | null;
  onClose: () => void;
}

const HelpCategoryModal: React.FC<Props> = ({ visible, editingItem, onClose }) => {
  const [formData, setFormData] = useState<HelpCategory>({
    name: '',
    order: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        name: '',
        order: 0,
      });
    }
  }, [editingItem, visible]);

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('请填写分类名称');
      return;
    }

    setLoading(true);
    try {
      if (editingItem?.id) {
        await adminAPI.updateHelpCategory(editingItem.id, formData);
      } else {
        await adminAPI.createHelpCategory(formData);
      }
      onClose();
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(error.response?.data?.message || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {editingItem ? '编辑帮助分类' : '新增帮助分类'}
        </h2>

        <FormItem label="分类名称" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例如：常见问题"
          />
        </FormItem>

        <FormItem label="排序">
          <Input
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
            placeholder="数字越小越靠前"
          />
        </FormItem>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HelpCategoryModal;
