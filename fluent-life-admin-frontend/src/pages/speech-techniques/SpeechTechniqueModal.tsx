import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Button from '../../components/form/Button';
import FormItem from '../../components/form/FormItem';
import Input from '../../components/form/Input';

interface SpeechTechnique {
  id?: string;
  name: string;
  icon: string;
  description: string;
  tips: string; // JSON字符串数组
  practice_texts: string; // JSON字符串数组
  order: number;
  is_active: boolean;
}

interface Props {
  visible: boolean;
  editingItem: SpeechTechnique | null;
  onClose: () => void;
}

const SpeechTechniqueModal: React.FC<Props> = ({ visible, editingItem, onClose }) => {
  const [formData, setFormData] = useState<SpeechTechnique>({
    name: '',
    icon: '🎯',
    description: '',
    tips: '[]',
    practice_texts: '[]',
    order: 0,
    is_active: true,
  });
  const [tipsArray, setTipsArray] = useState<string[]>([]);
  const [practiceTextsArray, setPracticeTextsArray] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
      try {
        setTipsArray(JSON.parse(editingItem.tips || '[]'));
      } catch {
        setTipsArray([]);
      }
      try {
        setPracticeTextsArray(JSON.parse(editingItem.practice_texts || '[]'));
      } catch {
        setPracticeTextsArray([]);
      }
    } else {
      setFormData({
        name: '',
        icon: '🎯',
        description: '',
        tips: '[]',
        practice_texts: '[]',
        order: 0,
        is_active: true,
      });
      setTipsArray([]);
      setPracticeTextsArray([]);
    }
  }, [editingItem, visible]);

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('请填写名称');
      return;
    }

    const submitData = {
      ...formData,
      tips: JSON.stringify(tipsArray),
      practice_texts: JSON.stringify(practiceTextsArray),
    };

    setLoading(true);
    try {
      if (editingItem?.id) {
        await adminAPI.updateSpeechTechnique(editingItem.id, submitData);
      } else {
        await adminAPI.createSpeechTechnique(submitData);
      }
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const addTip = () => {
    setTipsArray([...tipsArray, '']);
  };

  const removeTip = (index: number) => {
    setTipsArray(tipsArray.filter((_, i) => i !== index));
  };

  const updateTip = (index: number, value: string) => {
    const newTips = [...tipsArray];
    newTips[index] = value;
    setTipsArray(newTips);
  };

  const addPracticeText = () => {
    setPracticeTextsArray([...practiceTextsArray, '']);
  };

  const removePracticeText = (index: number) => {
    setPracticeTextsArray(practiceTextsArray.filter((_, i) => i !== index));
  };

  const updatePracticeText = (index: number, value: string) => {
    const newTexts = [...practiceTextsArray];
    newTexts[index] = value;
    setPracticeTextsArray(newTexts);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {editingItem ? '编辑语音技巧' : '新增语音技巧'}
        </h2>

        <div className="space-y-4">
          <FormItem label="名称" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：慢速说话"
            />
          </FormItem>

          <FormItem label="图标">
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="例如：🐢"
            />
          </FormItem>

          <FormItem label="描述">
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="例如：降低语速，减少卡顿"
            />
          </FormItem>

          <FormItem label="训练要点">
            <div className="space-y-2">
              {tipsArray.map((tip, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={tip}
                    onChange={(e) => updateTip(index, e.target.value)}
                    placeholder={`要点 ${index + 1}`}
                  />
                  <button
                    onClick={() => removeTip(index)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    删除
                  </button>
                </div>
              ))}
              <button
                onClick={addTip}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                + 添加要点
              </button>
            </div>
          </FormItem>

          <FormItem label="练习文本">
            <div className="space-y-2">
              {practiceTextsArray.map((text, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    value={text}
                    onChange={(e) => updatePracticeText(index, e.target.value)}
                    placeholder={`练习文本 ${index + 1}`}
                    className="flex-1 px-3 py-2 border rounded-lg min-h-[60px]"
                  />
                  <button
                    onClick={() => removePracticeText(index)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    删除
                  </button>
                </div>
              ))}
              <button
                onClick={addPracticeText}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                + 添加练习文本
              </button>
            </div>
          </FormItem>

          <FormItem label="排序">
            <Input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
            />
          </FormItem>

          <FormItem label="状态">
            <select
              value={formData.is_active ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </FormItem>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SpeechTechniqueModal;
