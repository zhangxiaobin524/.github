import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Button from '../../components/form/Button';
import FormItem from '../../components/form/FormItem';
import Input from '../../components/form/Input';
import Select from '../../components/form/Select';
import Textarea from '../../components/form/Textarea';

interface LegalDocument {
  id?: string;
  type: 'terms_of_service' | 'privacy_policy';
  title: string;
  content: string;
  version: string;
  is_active: boolean;
}

interface Props {
  visible: boolean;
  editingItem: LegalDocument | null;
  viewingItem: LegalDocument | null;
  onClose: () => void;
}

const LegalDocumentModal: React.FC<Props> = ({ visible, editingItem, viewingItem, onClose }) => {
  const [formData, setFormData] = useState<LegalDocument>({
    type: 'terms_of_service',
    title: '',
    content: '',
    version: '1.0.0',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const isViewMode = !!viewingItem;

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else if (viewingItem) {
      setFormData(viewingItem);
    } else {
      setFormData({
        type: 'terms_of_service',
        title: '',
        content: '',
        version: '1.0.0',
        is_active: true,
      });
    }
  }, [editingItem, viewingItem, visible]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      alert('请填写标题和内容');
      return;
    }

    setLoading(true);
    try {
      if (editingItem?.id) {
        await adminAPI.updateLegalDocument(editingItem.id, formData);
      } else {
        await adminAPI.createLegalDocument(formData);
      }
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold mb-4">
          {isViewMode ? '查看文档' : editingItem ? '编辑法律文档' : '新增法律文档'}
        </h2>
        
        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          <div className="space-y-4">
            <FormItem label="类型" required>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'terms_of_service' | 'privacy_policy' })}
                disabled={isViewMode || !!editingItem}
                options={[
                  { label: '服务协议', value: 'terms_of_service' },
                  { label: '隐私政策', value: 'privacy_policy' },
                ]}
              />
            </FormItem>

            <FormItem label="标题" required>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isViewMode}
                placeholder="请输入标题"
              />
            </FormItem>

            <FormItem label="版本" required>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                disabled={isViewMode}
                placeholder="例如：1.0.0"
              />
            </FormItem>

            <FormItem label="内容" required>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                disabled={isViewMode}
                placeholder="请输入内容（支持Markdown格式）"
                rows={15}
                className="font-mono text-sm"
              />
            </FormItem>

            {!isViewMode && (
              <FormItem label="状态">
                <Select
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                  options={[
                    { label: '启用', value: 'true' },
                    { label: '禁用', value: 'false' },
                  ]}
                />
              </FormItem>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          {!isViewMode && (
            <Button onClick={handleSubmit} loading={loading}>
              保存
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentModal;
