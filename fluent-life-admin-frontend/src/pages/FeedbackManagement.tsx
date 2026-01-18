import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Modal, Form, Input, Select, message, Space, Popconfirm, Descriptions } from 'antd';
import { EditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

interface Feedback {
  id: string;
  user_id: string;
  content: string;
  type: string;
  status: string;
  response: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
  };
}

const FeedbackManagement: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null);
  const [updatingFeedback, setUpdatingFeedback] = useState<Feedback | null>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get('/api/v1/admin/feedback', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbacks(response.data.data.feedbacks || []);
    } catch (error) {
      message.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleView = async (id: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get(`/api/v1/admin/feedback/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewingFeedback(response.data.data);
      setIsViewModalVisible(true);
    } catch (error) {
      message.error('获取反馈详情失败');
    }
  };

  const handleUpdateStatus = async (feedback: Feedback) => {
    setUpdatingFeedback(feedback);
    form.setFieldsValue({
      status: feedback.status,
      response: feedback.response || ''
    });
    setIsUpdateModalVisible(true);
  };

  const handleUpdate = async (values: any) => {
    if (!updatingFeedback) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      await axios.put(`/api/v1/admin/feedback/${updatingFeedback.id}/status`, values, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      message.success('更新成功');
      setIsUpdateModalVisible(false);
      fetchFeedbacks();
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      await axios.delete(`/api/v1/admin/feedback/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      message.success('删除成功');
      fetchFeedbacks();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug': return 'red';
      case 'suggestion': return 'blue';
      case 'feedback': return 'green';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'processing': return 'blue';
      case 'resolved': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: '用户',
      dataIndex: ['user', 'username'],
      key: 'username',
      render: (username: string) => username || '匿名用户'
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      key: 'content',
      width: 300,
      render: (text: string) => (
        <div className="max-w-xs truncate" title={text}>
          {text}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {type === 'bug' ? 'Bug报告' : type === 'suggestion' ? '建议' : '反馈'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'pending' ? '待处理' : status === 'processing' ? '处理中' : '已解决'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Feedback) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleView(record.id)}
          >
            查看
          </Button>
          <Button 
            type="default" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleUpdateStatus(record)}
          >
            处理
          </Button>
          <Popconfirm
            title="确定要删除这条反馈吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="dashed" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card 
        title="用户反馈管理"
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchFeedbacks}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={feedbacks}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 查看反馈详情模态框 */}
      <Modal
        title="反馈详情"
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {viewingFeedback && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="用户">
              {viewingFeedback.user?.username || '匿名用户'}
            </Descriptions.Item>
            <Descriptions.Item label="反馈类型">
              <Tag color={getTypeColor(viewingFeedback.type)}>
                {viewingFeedback.type === 'bug' ? 'Bug报告' : viewingFeedback.type === 'suggestion' ? '建议' : '反馈'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(viewingFeedback.status)}>
                {viewingFeedback.status === 'pending' ? '待处理' : viewingFeedback.status === 'processing' ? '处理中' : '已解决'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="反馈内容">
              <div className="whitespace-pre-wrap">{viewingFeedback.content}</div>
            </Descriptions.Item>
            {viewingFeedback.response && (
              <Descriptions.Item label="管理员回复">
                <div className="whitespace-pre-wrap text-blue-600">{viewingFeedback.response}</div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {new Date(viewingFeedback.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(viewingFeedback.updated_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 更新反馈状态模态框 */}
      <Modal
        title="处理反馈"
        open={isUpdateModalVisible}
        onCancel={() => setIsUpdateModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          onFinish={handleUpdate}
          layout="vertical"
        >
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select>
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已解决</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="response" label="回复内容">
            <TextArea rows={4} placeholder="请输入回复内容..." />
          </Form.Item>
          
          <Form.Item className="mt-6">
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setIsUpdateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FeedbackManagement;