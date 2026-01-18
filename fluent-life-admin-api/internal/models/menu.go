package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Menu struct {
	ID       uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name     string     `gorm:"type:varchar(50);not null" json:"name"`     // 菜单名称
	Path     string     `gorm:"type:varchar(200)" json:"path"`              // 路径
	Icon     string     `gorm:"type:varchar(50)" json:"icon"`               // 图标
	ParentID *uuid.UUID `gorm:"type:uuid" json:"parent_id,omitempty"`      // 父菜单ID
	Sort     int        `gorm:"default:0" json:"sort"`                      // 排序
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	
	Parent   *Menu   `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []Menu  `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

func (m *Menu) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
