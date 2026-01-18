package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserSettings 用户设置（通知/隐私/通用偏好）
type UserSettings struct {
	ID                 uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID             uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	// 通知设置
	EnablePushNotifications bool `gorm:"not null;default:true" json:"enable_push_notifications"` // 是否启用推送通知
	EnableEmailNotifications bool `gorm:"not null;default:true" json:"enable_email_notifications"` // 是否启用邮件通知
	NotificationSound       bool `gorm:"not null;default:true" json:"notification_sound"`        // 通知声音
	
	// 隐私设置
	PublicProfile           bool   `gorm:"not null;default:false" json:"public_profile"`             // 是否公开个人资料
	ShowTrainingStats       bool   `gorm:"not null;default:true" json:"show_training_stats"`         // 是否显示训练统计
	AllowFriendRequests     bool   `gorm:"not null;default:true" json:"allow_friend_requests"`       // 是否允许好友请求
	DataCollectionConsent   bool   `gorm:"not null;default:true" json:"data_collection_consent"`     // 数据收集同意
	
	// AI设置
	AIVoiceType             string `gorm:"type:varchar(100);default:'zh_female_wanqudashu_moon_bigtts'" json:"ai_voice_type"` // AI语音类型
	AISpeakingSpeed         int    `gorm:"not null;default:50" json:"ai_speaking_speed"`                                       // AI语速 (1-100)
	AIPersonality           string `gorm:"type:varchar(20);default:'friendly'" json:"ai_personality"`                          // AI个性 (friendly/professional/strict)
	
	// 训练偏好
	DifficultyLevel         string `gorm:"type:varchar(20);default:'beginner'" json:"difficulty_level"` // 默认难度级别
	DailyGoalMinutes        int    `gorm:"not null;default:15" json:"daily_goal_minutes"`               // 每日目标分钟数
	PreferredPracticeTime   string `gorm:"type:varchar(20)" json:"preferred_practice_time,omitempty"`   // 偏好练习时间
	
	// 界面设置
	Theme                   string `gorm:"type:varchar(20);default:'light'" json:"theme"`              // 主题 (light/dark/auto)
	FontSize                string `gorm:"type:varchar(20);default:'medium'" json:"font_size"`         // 字体大小 (small/medium/large)
	Language                string `gorm:"type:varchar(10);default:'zh-CN'" json:"language"`           // 语言设置
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (us *UserSettings) BeforeCreate(tx *gorm.DB) error {
	if us.ID == uuid.Nil {
		us.ID = uuid.New()
	}
	return nil
}