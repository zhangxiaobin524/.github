package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Username     string     `gorm:"type:varchar(50);not null;uniqueIndex" json:"username"`
	Email        *string    `gorm:"type:varchar(255);uniqueIndex" json:"email,omitempty"`
	Phone        *string    `gorm:"type:varchar(20);uniqueIndex" json:"phone,omitempty"`
	PasswordHash string     `gorm:"type:varchar(255);not null" json:"-"`
	AvatarURL    *string    `gorm:"type:varchar(500)" json:"avatar_url,omitempty"`
	Status       int        `gorm:"not null;default:1" json:"status"` // 0-禁用, 1-正常
	Role         string     `gorm:"type:varchar(20);not null;default:'user'" json:"role"` // user, admin, super_admin
	Gender       *string    `gorm:"type:varchar(10)" json:"gender,omitempty"` // 性别
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}






