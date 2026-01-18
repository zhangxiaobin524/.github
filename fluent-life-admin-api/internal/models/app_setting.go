package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AppSetting 存放應用程式的全域設定，例如版本號、客服聯絡方式等
// 透過 key-value 方式儲存，方便未來擴充
type AppSetting struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Key         string    `gorm:"type:varchar(100);not null;unique" json:"key"` // 設定項的鍵，例如 "app_version", "customer_service_email"
	Value       string    `gorm:"type:text;not null" json:"value"`                 // 設定項的值
	Description string    `gorm:"type:varchar(255)" json:"description"`          // 該設定項的描述
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (s *AppSetting) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return
}
