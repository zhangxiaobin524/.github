package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"fluent-life-admin-api/internal/models"
	"fluent-life-admin-api/pkg/response"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AISimulationRole 表示一个AI角色配置
type AISimulationRole struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	SystemPrompt string `json:"system_prompt"`
	VoiceType   string `json:"voice_type"`
	Enabled     bool   `json:"enabled"`
}

// GetAIRoles 获取所有AI角色配置（管理员）
// GET /api/v1/admin/ai-roles
func (h *AdminHandler) GetAIRoles(c *gin.Context) {
	roles, err := h.loadRolesFromDB()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "获取AI角色配置失败: "+err.Error())
		return
	}
	response.Success(c, gin.H{"roles": roles}, "获取成功")
}

// CreateAIRole 创建AI角色（管理员）
// POST /api/v1/admin/ai-roles
func (h *AdminHandler) CreateAIRole(c *gin.Context) {
	var role AISimulationRole
	if err := c.ShouldBindJSON(&role); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 验证必填字段
	if role.ID == "" || role.Name == "" || role.SystemPrompt == "" {
		response.Error(c, http.StatusBadRequest, "id、name和system_prompt为必填项")
		return
	}

	roles, err := h.loadRolesFromDB()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "加载角色配置失败: "+err.Error())
		return
	}

	// 检查ID是否已存在
	for _, r := range roles {
		if r.ID == role.ID {
			response.Error(c, http.StatusBadRequest, "角色ID已存在")
			return
		}
	}

	// 验证音色类型是否存在且启用
	if role.VoiceType != "" {
		var voiceType models.VoiceType
		if err := h.db.Where("type = ? AND enabled = ?", role.VoiceType, true).First(&voiceType).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				response.Error(c, http.StatusBadRequest, "音色类型不存在或未启用")
				return
			}
			response.Error(c, http.StatusInternalServerError, "验证音色类型失败: "+err.Error())
			return
		}
	} else {
		// 如果没有指定音色，尝试使用第一个启用的音色
		var defaultVoiceType models.VoiceType
		if err := h.db.Where("enabled = ?", true).First(&defaultVoiceType).Error; err == nil {
			role.VoiceType = defaultVoiceType.Type
		} else {
			// 如果数据库中没有音色，使用默认值
			role.VoiceType = "zh_female_wanqudashu_moon_bigtts"
		}
	}

	roles = append(roles, role)
	if err := h.saveRolesToDB(roles); err != nil {
		response.Error(c, http.StatusInternalServerError, "保存角色配置失败: "+err.Error())
		return
	}

	response.Success(c, role, "创建成功")
}

// UpdateAIRole 更新AI角色（管理员）
// PUT /api/v1/admin/ai-roles/:id
func (h *AdminHandler) UpdateAIRole(c *gin.Context) {
	roleID := c.Param("id")

	var req AISimulationRole
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	roles, err := h.loadRolesFromDB()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "加载角色配置失败: "+err.Error())
		return
	}

	// 验证音色类型是否存在且启用
	if req.VoiceType != "" {
		var voiceType models.VoiceType
		if err := h.db.Where("type = ? AND enabled = ?", req.VoiceType, true).First(&voiceType).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				response.Error(c, http.StatusBadRequest, "音色类型不存在或未启用")
				return
			}
			response.Error(c, http.StatusInternalServerError, "验证音色类型失败: "+err.Error())
			return
		}
	}

	// 查找并更新角色
	found := false
	for i := range roles {
		if roles[i].ID == roleID {
			// 保留原有ID，更新其他字段
			req.ID = roleID
			roles[i] = req
			found = true
			break
		}
	}

	if !found {
		response.Error(c, http.StatusNotFound, "角色不存在")
		return
	}

	if err := h.saveRolesToDB(roles); err != nil {
		response.Error(c, http.StatusInternalServerError, "保存角色配置失败: "+err.Error())
		return
	}

	response.Success(c, req, "更新成功")
}

// DeleteAIRole 删除AI角色（管理员）
// DELETE /api/v1/admin/ai-roles/:id
func (h *AdminHandler) DeleteAIRole(c *gin.Context) {
	roleID := c.Param("id")

	roles, err := h.loadRolesFromDB()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "加载角色配置失败: "+err.Error())
		return
	}

	// 过滤掉要删除的角色
	newRoles := make([]AISimulationRole, 0)
	found := false
	for _, r := range roles {
		if r.ID != roleID {
			newRoles = append(newRoles, r)
		} else {
			found = true
		}
	}

	if !found {
		response.Error(c, http.StatusNotFound, "角色不存在")
		return
	}

	if err := h.saveRolesToDB(newRoles); err != nil {
		response.Error(c, http.StatusInternalServerError, "保存角色配置失败: "+err.Error())
		return
	}

	response.Success(c, nil, "删除成功")
}

// InitAIRolesFromConfig 从配置文件初始化AI角色（管理员）
// POST /api/v1/admin/ai-roles/init-from-config
func (h *AdminHandler) InitAIRolesFromConfig(c *gin.Context) {
	// 默认角色配置
	defaultRoles := []AISimulationRole{
		{
			ID:          "interviewer",
			Name:        "面试官",
			Description: "专业的面试官，帮助提升面试技巧",
			SystemPrompt: "你现在是一名面试官，请根据用户的问题进行提问和追问，并对用户的回答进行评价和指导。你的目标是模拟一场真实的面试，帮助用户提升面试技巧。",
			VoiceType:   "zh_female_wanqudashu_moon_bigtts",
			Enabled:     true,
		},
		{
			ID:          "language_tutor",
			Name:        "语言导师",
			Description: "专业的语言导师，帮助练习口语和纠正语法",
			SystemPrompt: "你现在是一名语言导师，请帮助用户练习口语，纠正语法错误，并提供词汇和表达建议。你的目标是帮助用户提高语言流利度和准确性。",
			VoiceType:   "zh_female_wanqudashu_moon_bigtts",
			Enabled:     true,
		},
		{
			ID:          "presentation_coach",
			Name:        "演讲教练",
			Description: "专业的演讲教练，帮助准备演讲和提升表达能力",
			SystemPrompt: "你现在是一名演讲教练，请帮助用户准备演讲，提供演讲稿修改建议，并指导用户如何更好地表达。你的目标是帮助用户提升演讲能力和自信心。",
			VoiceType:   "zh_female_wanqudashu_moon_bigtts",
			Enabled:     true,
		},
	}

	if err := h.saveRolesToDB(defaultRoles); err != nil {
		response.Error(c, http.StatusInternalServerError, "初始化AI角色配置失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{"roles": defaultRoles}, "初始化成功")
}

// loadRolesFromDB 从数据库加载角色配置
func (h *AdminHandler) loadRolesFromDB() ([]AISimulationRole, error) {
	roles := make([]AISimulationRole, 0)

	// 尝试从数据库读取配置
	var setting models.AppSetting
	err := h.db.Where("key = ?", "ai_simulation_roles").First(&setting).Error
	if err == nil {
		// 如果数据库中有配置，则使用数据库配置
		var dbRoles []AISimulationRole
		if err := json.Unmarshal([]byte(setting.Value), &dbRoles); err == nil {
			if len(dbRoles) > 0 {
				roles = dbRoles
			}
		} else {
			// JSON解析失败，返回错误
			return nil, fmt.Errorf("解析数据库中的AI角色配置失败: %w", err)
		}
	} else if err != gorm.ErrRecordNotFound {
		// 如果是其他错误，返回错误
		return nil, fmt.Errorf("从数据库加载AI角色配置失败: %w", err)
	}
	// 如果没找到（ErrRecordNotFound），返回空列表

	return roles, nil
}

// saveRolesToDB 保存角色配置到数据库
func (h *AdminHandler) saveRolesToDB(roles []AISimulationRole) error {
	rolesJSON, err := json.Marshal(roles)
	if err != nil {
		return err
	}

	var setting models.AppSetting
	err = h.db.Where("key = ?", "ai_simulation_roles").First(&setting).Error
	if err == gorm.ErrRecordNotFound {
		// 如果不存在，创建新记录
		setting = models.AppSetting{
			Key:         "ai_simulation_roles",
			Value:       string(rolesJSON),
			Description: "AI实战模拟角色配置",
		}
		return h.db.Create(&setting).Error
	} else if err != nil {
		return err
	}

	// 如果存在，更新
	setting.Value = string(rolesJSON)
	return h.db.Save(&setting).Error
}
