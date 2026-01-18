package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TongueTwister 绕口令模型
type TongueTwister struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title       string    `gorm:"type:varchar(200);not null" json:"title"`
	Content     string    `gorm:"type:text;not null" json:"content"`
	Tips        string    `gorm:"type:text" json:"tips"`
	Level       string    `gorm:"type:varchar(20);not null;index:idx_tongue_twister_level" json:"level"` // 'basic' | 'intermediate' | 'advanced'
	Order       int       `gorm:"not null;default:0;index:idx_tongue_twister_order" json:"order"`        // 排序字段
	IsActive    bool      `gorm:"not null;default:true;index:idx_tongue_twister_active" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// DailyExpression 每日朗诵文案模型
type DailyExpression struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title       string    `gorm:"type:varchar(200);not null" json:"title"`
	Content     string    `gorm:"type:text;not null" json:"content"`
	Tips        string    `gorm:"type:text" json:"tips"` // 朗诵技巧提示
	Source      string    `gorm:"type:varchar(100)" json:"source"` // 来源，如"人民日报"
	Date        time.Time `gorm:"type:date;not null;index:idx_daily_expression_date" json:"date"` // 发布日期
	IsActive    bool      `gorm:"not null;default:true;index:idx_daily_expression_active" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (t *TongueTwister) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

func (d *DailyExpression) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

// SpeechTechnique 语音技巧训练模型
type SpeechTechnique struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name          string    `gorm:"type:varchar(100);not null" json:"name"`                    // 技巧名称，如"慢速说话"
	Icon          string    `gorm:"type:varchar(10)" json:"icon"`                              // 图标emoji
	Description   string    `gorm:"type:varchar(200)" json:"description"`                     // 简短描述
	Tips          string    `gorm:"type:text" json:"tips"`                                     // 训练要点，JSON数组字符串
	PracticeTexts string   `gorm:"type:text" json:"practice_texts"`                          // 练习文本，JSON数组字符串
	Order         int       `gorm:"not null;default:0;index:idx_speech_technique_order" json:"order"` // 排序字段
	IsActive      bool      `gorm:"not null;default:true;index:idx_speech_technique_active" json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (s *SpeechTechnique) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
