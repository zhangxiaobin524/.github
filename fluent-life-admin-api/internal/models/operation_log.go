package models

import (
	"time"

	"github.com/google/uuid"
)

// OperationLog represents an administrative operation log entry.
type OperationLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Username  string    `gorm:"type:varchar(50);not null" json:"username"`
	UserRole  string    `gorm:"type:varchar(20);not null" json:"user_role"`
	Action    string    `gorm:"type:varchar(100);not null" json:"action"`
	Resource  string    `gorm:"type:varchar(100);not null" json:"resource"` // e.g., "User", "Post", "Room"
	ResourceID string    `gorm:"type:varchar(255)" json:"resource_id,omitempty"` // ID of the affected resource
	Details   string    `gorm:"type:text" json:"details,omitempty"`
	Status    string    `gorm:"type:varchar(20);not null" json:"status"` // "Success", "Failure"
	CreatedAt time.Time `json:"created_at"`
}
