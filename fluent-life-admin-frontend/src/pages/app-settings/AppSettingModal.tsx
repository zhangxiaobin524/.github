import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Button from '../../components/form/Button';
import FormItem from '../../components/form/FormItem';
import Input from '../../components/form/Input';
import Textarea from '../../components/form/Textarea';

interface AppSetting {
  id?: string;
  key: string;
  value: string;
  description?: string;
}

interface Props {
  visible: boolean;
  editingItem: AppSetting | null;
  onClose: () => void;
}

const AppSettingModal: React.FC<Props> = ({ visible, editingItem, onClose }) => {
  const [formData, setFormData] = useState<AppSetting>({
    key: '',
    value: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        key: '',
        value: '',
        description: '',
      });
    }
  }, [editingItem, visible]);

  const handleSubmit = async () => {
    if (!formData.key || !formData.value) {
      alert('请填写键名和值');
      return;
    }

    setLoading(true);
    try {
      if (editingItem?.id) {
        await adminAPI.updateAppSetting(editingItem.id, formData);
      } else {
        await adminAPI.createAppSetting(formData);
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
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold mb-4">
          {editingItem ? '编辑应用设置' : '新增应用设置'}
        </h2>

        <div className="flex-1 overflow-y-auto">
          <FormItem label="键名" required>
            <Input
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder="例如：app_version"
              disabled={!!editingItem?.id}
            />
            <p className="text-xs text-gray-500 mt-1">键名创建后不可修改</p>
          </FormItem>

          <FormItem label="值" required>
            <Textarea
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="输入设置的值"
              rows={6}
            />
          </FormItem>

          <FormItem label="描述">
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="可选：描述这个设置的用途"
            />
          </FormItem>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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

export default AppSettingModal;
