package models

import (
	"time"

	"github.com/google/uuid"
)

// ExposureModule 脱敏练习模块
type ExposureModule struct {
	ID           string    `gorm:"column:id;primaryKey" json:"id"`
	Title        string    `gorm:"column:title;not null" json:"title"`
	Description  string    `gorm:"column:description;not null" json:"description"`
	Icon         string    `gorm:"column:icon;not null" json:"icon"`
	Color        string    `gorm:"column:color;not null" json:"color"`
	DisplayOrder int       `gorm:"column:display_order;default:0" json:"display_order"`
	IsActive     bool      `gorm:"column:is_active;default:true" json:"is_active"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`

	// 关联关系
	Steps []ExposureStep `gorm:"foreignKey:ModuleID;references:ID" json:"steps,omitempty"`
}

// TableName 指定表名
func (ExposureModule) TableName() string {
	return "exposure_modules"
}

// ExposureStep 脱敏练习步骤
type ExposureStep struct {
	ID                  uuid.UUID `gorm:"column:id;type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ModuleID            string    `gorm:"column:module_id;not null;index" json:"module_id"`
	StepOrder           int       `gorm:"column:step_order;not null" json:"step_order"`
	StepType            string    `gorm:"column:step_type;not null" json:"step_type"` // approach, conversation, upload, analysis, profile, community
	Title               string    `gorm:"column:title;not null" json:"title"`
	Description         string    `gorm:"column:description;not null" json:"description"`
	GuideContent        string    `gorm:"column:guide_content;type:text" json:"guide_content"`                     // 执行指南内容
	ScenarioListTitle   string    `gorm:"column:scenario_list_title;type:varchar(200)" json:"scenario_list_title"` // 场景列表标题
	ScenarioListContent string    `gorm:"column:scenario_list_content;type:text" json:"scenario_list_content"`     // 场景列表内容
	PopupConfigs        string    `gorm:"column:popup_configs;type:jsonb" json:"popup_configs"`                    // 弹窗配置数组，JSON格式
	Icon                string    `gorm:"column:icon;not null" json:"icon"`
	CreatedAt           time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt           time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

// TableName 指定表名
func (ExposureStep) TableName() string {
	return "exposure_steps"
}
