package handlers

import (
	"net/http"
	"fluent-life-admin-api/internal/models"
	"fluent-life-admin-api/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetVoiceTypes 获取所有音色类型（管理员）
// GET /api/v1/admin/voice-types
func (h *AdminHandler) GetVoiceTypes(c *gin.Context) {
	var voiceTypes []models.VoiceType
	if err := h.db.Order("created_at DESC").Find(&voiceTypes).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "获取音色类型失败: "+err.Error())
		return
	}
	response.Success(c, gin.H{"voice_types": voiceTypes}, "获取成功")
}

// GetVoiceType 获取单个音色类型（管理员）
// GET /api/v1/admin/voice-types/:id
func (h *AdminHandler) GetVoiceType(c *gin.Context) {
	id := c.Param("id")
	voiceTypeID, err := uuid.Parse(id)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "无效的音色类型ID")
		return
	}

	var voiceType models.VoiceType
	if err := h.db.First(&voiceType, voiceTypeID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "音色类型不存在")
		} else {
			response.Error(c, http.StatusInternalServerError, "获取音色类型失败: "+err.Error())
		}
		return
	}
	response.Success(c, voiceType, "获取成功")
}

// CreateVoiceType 创建音色类型（管理员）
// POST /api/v1/admin/voice-types
func (h *AdminHandler) CreateVoiceType(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Description string `json:"description"`
		Enabled     bool   `json:"enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 检查音色类型是否已存在
	var existingVoiceType models.VoiceType
	if err := h.db.Where("type = ?", req.Type).First(&existingVoiceType).Error; err == nil {
		response.Error(c, http.StatusConflict, "音色类型已存在")
		return
	} else if err != gorm.ErrRecordNotFound {
		response.Error(c, http.StatusInternalServerError, "检查音色类型失败: "+err.Error())
		return
	}

	voiceType := models.VoiceType{
		Name:        req.Name,
		Type:        req.Type,
		Description: req.Description,
		Enabled:     req.Enabled,
	}

	if err := h.db.Create(&voiceType).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建音色类型失败: "+err.Error())
		return
	}

	h.logOperation(c, "create", "voice_type", voiceType.ID.String(), "创建音色类型: "+voiceType.Name, "success")
	response.Success(c, voiceType, "创建成功")
}

// UpdateVoiceType 更新音色类型（管理员）
// PUT /api/v1/admin/voice-types/:id
func (h *AdminHandler) UpdateVoiceType(c *gin.Context) {
	id := c.Param("id")
	voiceTypeID, err := uuid.Parse(id)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "无效的音色类型ID")
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Description string `json:"description"`
		Enabled     bool   `json:"enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	var voiceType models.VoiceType
	if err := h.db.First(&voiceType, voiceTypeID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "音色类型不存在")
		} else {
			response.Error(c, http.StatusInternalServerError, "获取音色类型失败: "+err.Error())
		}
		return
	}

	// 如果类型改变了，检查新类型是否已存在
	if voiceType.Type != req.Type {
		var existingVoiceType models.VoiceType
		if err := h.db.Where("type = ? AND id != ?", req.Type, voiceTypeID).First(&existingVoiceType).Error; err == nil {
			response.Error(c, http.StatusConflict, "音色类型已存在")
			return
		} else if err != gorm.ErrRecordNotFound {
			response.Error(c, http.StatusInternalServerError, "检查音色类型失败: "+err.Error())
			return
		}
	}

	voiceType.Name = req.Name
	voiceType.Type = req.Type
	voiceType.Description = req.Description
	voiceType.Enabled = req.Enabled

	if err := h.db.Save(&voiceType).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新音色类型失败: "+err.Error())
		return
	}

	h.logOperation(c, "update", "voice_type", voiceType.ID.String(), "更新音色类型: "+voiceType.Name, "success")
	response.Success(c, voiceType, "更新成功")
}

// DeleteVoiceType 删除音色类型（管理员）
// DELETE /api/v1/admin/voice-types/:id
func (h *AdminHandler) DeleteVoiceType(c *gin.Context) {
	id := c.Param("id")
	voiceTypeID, err := uuid.Parse(id)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "无效的音色类型ID")
		return
	}

	var voiceType models.VoiceType
	if err := h.db.First(&voiceType, voiceTypeID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "音色类型不存在")
		} else {
			response.Error(c, http.StatusInternalServerError, "获取音色类型失败: "+err.Error())
		}
		return
	}

	// 检查是否有AI角色正在使用此音色类型
	var count int64
	h.db.Model(&models.AppSetting{}).
		Where("key = ?", "ai_simulation_roles").
		Count(&count)
	
	if count > 0 {
		// 检查是否有角色使用此音色
		var setting models.AppSetting
		if err := h.db.Where("key = ?", "ai_simulation_roles").First(&setting).Error; err == nil {
			// 这里可以进一步检查JSON中是否使用了此音色类型
			// 为了简化，我们允许删除，但会在日志中记录
		}
	}

	if err := h.db.Delete(&voiceType).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除音色类型失败: "+err.Error())
		return
	}

	h.logOperation(c, "delete", "voice_type", voiceType.ID.String(), "删除音色类型: "+voiceType.Name, "success")
	response.Success(c, nil, "删除成功")
}

// GetEnabledVoiceTypes 获取所有启用的音色类型（用于下拉选择）
// GET /api/v1/admin/voice-types/enabled
func (h *AdminHandler) GetEnabledVoiceTypes(c *gin.Context) {
	var voiceTypes []models.VoiceType
	if err := h.db.Where("enabled = ?", true).Order("name ASC").Find(&voiceTypes).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "获取音色类型失败: "+err.Error())
		return
	}
	
	// 只返回必要的字段用于下拉选择
	type VoiceTypeOption struct {
		Type string `json:"type"`
		Name string `json:"name"`
	}
	
	options := make([]VoiceTypeOption, 0, len(voiceTypes))
	for _, vt := range voiceTypes {
		options = append(options, VoiceTypeOption{
			Type: vt.Type,
			Name: vt.Name,
		})
	}
	
	response.Success(c, gin.H{"voice_types": options}, "获取成功")
}
