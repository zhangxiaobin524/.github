package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// VoiceType 音色类型配置
type VoiceType struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"`        // 音色名称，例如 "温柔女声"
	Type        string    `gorm:"type:varchar(100);not null;unique" json:"type"` // 音色类型（技术标识），例如 "zh_female_wanqudashu_moon_bigtts"
	Description string    `gorm:"type:varchar(255)" json:"description"`         // 音色描述
	Enabled     bool      `gorm:"not null;default:true" json:"enabled"`         // 是否启用
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (v *VoiceType) BeforeCreate(tx *gorm.DB) (err error) {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return
}
