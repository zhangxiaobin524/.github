import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Button from '../../components/form/Button';
import FormItem from '../../components/form/FormItem';
import Input from '../../components/form/Input';
import Textarea from '../../components/form/Textarea';
import Select from '../../components/form/Select';

interface AIRole {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  voice_type: string;
  enabled: boolean;
}

interface Props {
  visible: boolean;
  editingItem: AIRole | null;
  onClose: () => void;
}

const AIRoleModal: React.FC<Props> = ({ visible, editingItem, onClose }) => {
  const [formData, setFormData] = useState<AIRole>({
    id: '',
    name: '',
    description: '',
    system_prompt: '',
    voice_type: '',
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [voiceTypeOptions, setVoiceTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingVoiceTypes, setLoadingVoiceTypes] = useState(false);

  useEffect(() => {
    if (visible) {
      loadVoiceTypes();
    }
  }, [visible]);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        system_prompt: '',
        voice_type: voiceTypeOptions[0]?.value || '',
        enabled: true,
      });
    }
  }, [editingItem, voiceTypeOptions]);

  const loadVoiceTypes = async () => {
    setLoadingVoiceTypes(true);
    try {
      const response = await adminAPI.getEnabledVoiceTypes();
      if (response.code === 0 && response.data) {
        const options = (response.data.voice_types || []).map((vt: { type: string; name: string }) => ({
          value: vt.type,
          label: `${vt.name} (${vt.type})`,
        }));
        setVoiceTypeOptions(options);
        // 如果没有编辑项且没有设置音色类型，设置第一个为默认值
        if (!editingItem && options.length > 0 && !formData.voice_type) {
          setFormData(prev => ({ ...prev, voice_type: options[0].value }));
        }
      }
    } catch (error) {
      console.error('加载音色类型失败:', error);
      // 如果加载失败，使用空数组，用户需要先创建音色类型
      setVoiceTypeOptions([]);
    } finally {
      setLoadingVoiceTypes(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.id || !formData.name || !formData.system_prompt) {
      alert('请填写角色ID、名称和系统提示词');
      return;
    }

    setLoading(true);
    try {
      if (editingItem?.id) {
        await adminAPI.updateAIRole(editingItem.id, formData);
      } else {
        await adminAPI.createAIRole(formData);
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
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold mb-4">
          {editingItem ? '编辑AI角色' : '新增AI角色'}
        </h2>

        <div className="flex-1 overflow-y-auto">
          <FormItem label="角色ID" required>
            <Input
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="例如：interviewer"
              disabled={!!editingItem?.id}
            />
            <p className="text-xs text-gray-500 mt-1">角色ID创建后不可修改，使用英文和下划线，例如：interviewer</p>
          </FormItem>

          <FormItem label="角色名称" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：面试官"
            />
          </FormItem>

          <FormItem label="角色描述">
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="可选：描述这个角色的用途"
            />
          </FormItem>

          <FormItem label="系统提示词" required>
            <Textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              placeholder="定义AI角色的行为和风格，例如：你现在是一名面试官，请根据用户的问题进行提问和追问..."
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-1">系统提示词决定了AI角色在对话中的行为和风格</p>
          </FormItem>

          <FormItem label="音色类型">
            {loadingVoiceTypes ? (
              <div className="text-sm text-gray-500">加载音色类型中...</div>
            ) : voiceTypeOptions.length === 0 ? (
              <div className="text-sm text-yellow-600">
                暂无可用的音色类型，请先在
                <a href="/voice-types" className="text-blue-600 underline ml-1 mr-1" target="_blank">音色管理</a>
                中创建音色类型
              </div>
            ) : (
              <Select
                value={formData.voice_type}
                onChange={(e) => setFormData({ ...formData, voice_type: e.target.value })}
                options={voiceTypeOptions}
                placeholder="请选择音色类型"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">选择该角色使用的语音合成音色，只能选择已启用的音色类型</p>
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

export default AIRoleModal;
