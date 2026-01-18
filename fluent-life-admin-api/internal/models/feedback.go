package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Feedback 用户反馈/意见
type Feedback struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index:idx_feedback_user_id" json:"user_id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Type      string    `gorm:"type:varchar(50);default:'feedback'" json:"type"` // feedback/bug/suggestion
	Status    string    `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending/processing/resolved
	Response  *string   `gorm:"type:text" json:"response,omitempty"`              // 管理员回复
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (f *Feedback) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}