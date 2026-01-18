import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import Card from '../../components/common/Card';
import { Users, Activity, TrendingUp, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminAPI.getDetailedStats();
      if (response.code === 0) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const statCards = [
    {
      title: '总用户数',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '活跃用户',
      value: stats?.active_users || 0,
      subtitle: '最近7天',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: '总训练记录',
      value: stats?.total_records || 0,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '总训练时长',
      value: stats?.total_duration || 0,
      unit: '分钟',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: '平均时长',
      value: stats?.avg_duration || 0,
      unit: '分钟',
      icon: Clock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: '总帖子数',
      value: stats?.total_posts || 0,
      icon: Activity,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: '总评论数',
      value: stats?.total_comments || 0,
      icon: Activity,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: '总点赞数',
      value: stats?.total_likes || 0,
      icon: Activity,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  const weeklyData = [
    { name: '周一', 训练: 120, 用户: 45 },
    { name: '周二', 训练: 132, 用户: 52 },
    { name: '周三', 训练: 101, 用户: 38 },
    { name: '周四', 训练: 134, 用户: 48 },
    { name: '周五', 训练: 90, 用户: 35 },
    { name: '周六', 训练: 230, 用户: 78 },
    { name: '周日', 训练: 210, 用户: 65 },
  ];

  // 训练类型分布数据
  const trainingTypeData = stats?.training_type_distribution || [
    { name: '冥想', value: 0 },
    { name: '气流', value: 0 },
    { name: '暴露', value: 0 },
    { name: '其他', value: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">数据概览</h1>
        <p className="mt-1 text-sm text-gray-500">欢迎回来，这是您的系统概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} shadow>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  {card.subtitle && <p className="text-xs text-gray-400 mb-1">{card.subtitle}</p>}
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                    {card.unit && <span className="text-sm text-gray-500">{card.unit}</span>}
                  </div>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="周数据趋势" shadow>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="训练" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="用户" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="训练类型分布" shadow>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trainingTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

