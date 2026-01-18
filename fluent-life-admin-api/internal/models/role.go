package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"type:varchar(50);not null;unique" json:"name"`        // 角色名称
	Code        string    `gorm:"type:varchar(50);not null;unique" json:"code"`        // 角色代码
	Description string    `gorm:"type:text" json:"description"`                        // 描述
	Permissions JSONB     `gorm:"type:jsonb;default:'[]'::jsonb" json:"permissions"`  // 权限列表，JSON数组
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (r *Role) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	if r.Permissions == nil {
		r.Permissions = JSONB{}
	}
	return nil
}
