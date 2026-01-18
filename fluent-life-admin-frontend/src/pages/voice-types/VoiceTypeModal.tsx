import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Button from '../../components/form/Button';
import FormItem from '../../components/form/FormItem';
import Input from '../../components/form/Input';
import Textarea from '../../components/form/Textarea';
import Select from '../../components/form/Select';

interface VoiceType {
  id: string;
  name: string;
  type: string;
  description: string;
  enabled: boolean;
}

interface Props {
  visible: boolean;
  editingItem: VoiceType | null;
  onClose: () => void;
}

const VoiceTypeModal: React.FC<Props> = ({ visible, editingItem, onClose }) => {
  const [formData, setFormData] = useState<VoiceType>({
    id: '',
    name: '',
    type: '',
    description: '',
    enabled: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        id: '',
        name: '',
        type: '',
        description: '',
        enabled: true,
      });
    }
  }, [editingItem, visible]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.type) {
      alert('请填写音色名称和音色类型');
      return;
    }

    setLoading(true);
    try {
      if (editingItem?.id) {
        await adminAPI.updateVoiceType(editingItem.id, formData);
      } else {
        await adminAPI.createVoiceType(formData);
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
          {editingItem ? '编辑音色类型' : '新增音色类型'}
        </h2>

        <div className="flex-1 overflow-y-auto">
          <FormItem label="音色名称" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：温柔女声"
            />
            <p className="text-xs text-gray-500 mt-1">音色的显示名称，用于在AI角色配置中选择时显示</p>
          </FormItem>

          <FormItem label="音色类型" required>
            <Input
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="例如：zh_female_wanqudashu_moon_bigtts"
              disabled={!!editingItem?.id}
            />
            <p className="text-xs text-gray-500 mt-1">
              {editingItem?.id 
                ? '音色类型创建后不可修改，这是技术标识符，用于语音合成服务'
                : '音色类型的技术标识符，用于语音合成服务，创建后不可修改。例如：zh_female_wanqudashu_moon_bigtts'}
            </p>
          </FormItem>

          <FormItem label="描述">
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="可选：描述这个音色的特点"
              rows={3}
            />
          </FormItem>

          <FormItem label="启用状态">
            <Select
              value={formData.enabled ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.value === 'true' })}
              options={[
                { value: 'true', label: '启用' },
                { value: 'false', label: '禁用' },
              ]}
            />
            <p className="text-xs text-gray-500 mt-1">只有启用的音色类型才能在AI角色配置中选择</p>
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

export default VoiceTypeModal;
