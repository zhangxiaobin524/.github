import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Button from '../../components/form/Button';
import FormItem from '../../components/form/FormItem';
import Input from '../../components/form/Input';
import Textarea from '../../components/form/Textarea';
import Select from '../../components/form/Select';

interface HelpArticle {
  id?: string;
  category_id: string;
  question: string;
  answer: string;
  order: number;
  is_active: boolean;
}

interface HelpCategory {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  editingItem: HelpArticle | null;
  categories: HelpCategory[];
  onClose: () => void;
}

const HelpArticleModal: React.FC<Props> = ({ visible, editingItem, categories, onClose }) => {
  const [formData, setFormData] = useState<HelpArticle>({
    category_id: '',
    question: '',
    answer: '',
    order: 0,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        category_id: categories[0]?.id || '',
        question: '',
        answer: '',
        order: 0,
        is_active: true,
      });
    }
  }, [editingItem, visible, categories]);

  const handleSubmit = async () => {
    if (!formData.category_id || !formData.question || !formData.answer) {
      alert('请填写分类、问题和答案');
      return;
    }

    setLoading(true);
    try {
      if (editingItem?.id) {
        await adminAPI.updateHelpArticle(editingItem.id, formData);
      } else {
        await adminAPI.createHelpArticle(formData);
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
          {editingItem ? '编辑帮助文章' : '新增帮助文章'}
        </h2>

        <div className="flex-1 overflow-y-auto">
          <FormItem label="分类" required>
            <Select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">请选择分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </FormItem>

          <FormItem label="问题" required>
            <Input
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="输入问题标题"
            />
          </FormItem>

          <FormItem label="答案" required>
            <Textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="输入答案内容（支持 Markdown）"
              rows={8}
            />
          </FormItem>

          <div className="grid grid-cols-2 gap-4">
            <FormItem label="排序">
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="数字越小越靠前"
              />
            </FormItem>

            <FormItem label="状态">
              <Select
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              >
                <option value="true">启用</option>
                <option value="false">禁用</option>
              </Select>
            </FormItem>
          </div>
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

export default HelpArticleModal;
