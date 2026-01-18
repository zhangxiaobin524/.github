import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Modal, Form, Input, Select, Switch, message, Space, Popconfirm } from 'antd';
import { EditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

interface UserSetting {
  id: string;
  user_id: string;
  enable_push_notifications: boolean;
  enable_email_notifications: boolean;
  notification_sound: boolean;
  public_profile: boolean;
  show_training_stats: boolean;
  allow_friend_requests: boolean;
  data_collection_consent: boolean;
  ai_voice_type: string;
  ai_speaking_speed: number;
  ai_personality: string;
  difficulty_level: string;
  daily_goal_minutes: number;
  preferred_practice_time: string;
  theme: string;
  font_size: string;
  language: string;
  created_at: string;
  updated_at: string;
}

const UserSettings: React.FC = () => {
  const [settings, setSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSetting, setEditingSetting] = useState<UserSetting | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await axios.get('/api/v1/admin/user-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data.data.settings || []);
    } catch (error) {
      message.error('获取用户设置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEdit = (setting: UserSetting) => {
    setEditingSetting(setting);
    form.setFieldsValue(setting);
    setIsModalVisible(true);
  };

  const handleUpdate = async (values: any) => {
    if (!editingSetting) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      await axios.put(`/api/v1/admin/user-settings/${editingSetting.user_id}`, values, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      message.success('更新成功');
      setIsModalVisible(false);
      fetchSettings();
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleReset = async (userId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      await axios.post(`/api/v1/admin/user-settings/${userId}/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      message.success('重置成功');
      fetchSettings();
    } catch (error) {
      message.error('重置失败');
    }
  };

  const columns = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
    },
    {
      title: '通知设置',
      key: 'notifications',
      render: (_: any, record: UserSetting) => (
        <Space>
          <Tag color={record.enable_push_notifications ? 'green' : 'red'}>
            {record.enable_push_notifications ? '推送开' : '推送关'}
          </Tag>
          <Tag color={record.enable_email_notifications ? 'green' : 'red'}>
            {record.enable_email_notifications ? '邮件开' : '邮件关'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'AI设置',
      key: 'ai_settings',
      render: (_: any, record: UserSetting) => (
        <Space>
          <Tag>{record.ai_voice_type.split('_')[2] || record.ai_voice_type}</Tag>
          <Tag>速度:{record.ai_speaking_speed}</Tag>
        </Space>
      ),
    },
    {
      title: '训练偏好',
      key: 'training',
      render: (_: any, record: UserSetting) => (
        <Space>
          <Tag color="blue">{record.difficulty_level}</Tag>
          <Tag color="purple">{record.daily_goal_minutes}分钟</Tag>
        </Space>
      ),
    },
    {
      title: '界面设置',
      key: 'ui',
      render: (_: any, record: UserSetting) => (
        <Space>
          <Tag>{record.theme}</Tag>
          <Tag>{record.font_size}</Tag>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: UserSetting) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要重置此用户的设置为默认值吗？"
            onConfirm={() => handleReset(record.user_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="default" size="small">重置</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card 
        title="用户设置管理"
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchSettings}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={settings}
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

      <Modal
        title="编辑用户设置"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          onFinish={handleUpdate}
          layout="vertical"
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="enable_push_notifications" label="推送通知" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="enable_email_notifications" label="邮件通知" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="notification_sound" label="通知声音" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="public_profile" label="公开个人资料" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="show_training_stats" label="显示训练统计" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="allow_friend_requests" label="允许好友请求" valuePropName="checked">
              <Switch />
            </Form.Item>
            
            <Form.Item name="ai_voice_type" label="AI语音类型">
              <Select>
                <Option value="zh_female_wanqudashu_moon_bigtts">温柔大叔</Option>
                <Option value="zh_female_wanwanxiaohe_moon_bigtts">温柔小河</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="ai_speaking_speed" label="AI语速 (1-100)">
              <Input type="number" min={1} max={100} />
            </Form.Item>
            
            <Form.Item name="difficulty_level" label="训练难度">
              <Select>
                <Option value="beginner">初级</Option>
                <Option value="intermediate">中级</Option>
                <Option value="advanced">高级</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="daily_goal_minutes" label="每日目标(分钟)">
              <Input type="number" min={5} max={120} />
            </Form.Item>
            
            <Form.Item name="theme" label="主题">
              <Select>
                <Option value="light">浅色</Option>
                <Option value="dark">深色</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="font_size" label="字体大小">
              <Select>
                <Option value="small">小</Option>
                <Option value="medium">中</Option>
                <Option value="large">大</Option>
              </Select>
            </Form.Item>
          </div>
          
          <Form.Item className="mt-6">
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserSettings;