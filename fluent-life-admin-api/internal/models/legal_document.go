package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LegalDocument 法律文档模型（服务协议、隐私政策等）
type LegalDocument struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Type      string     `gorm:"type:varchar(50);not null;unique" json:"type"` // 'terms_of_service' | 'privacy_policy'
	Title     string     `gorm:"type:varchar(200);not null" json:"title"`                                 // 文档标题
	Content   string     `gorm:"type:text;not null" json:"content"`                                      // 文档内容（HTML或Markdown格式）
	Version   string     `gorm:"type:varchar(20);not null;default:'1.0.0'" json:"version"`              // 版本号
	IsActive  bool       `gorm:"not null;default:true" json:"is_active"`                                 // 是否启用
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`                                 // 最后更新人（管理员ID）
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (l *LegalDocument) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}
