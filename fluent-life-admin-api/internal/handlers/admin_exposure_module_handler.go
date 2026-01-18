package handlers

import (
	"net/http"
	"strconv"

	"fluent-life-admin-api/internal/models"
	"fluent-life-admin-api/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AdminExposureModuleHandler 管理员脱敏练习模块处理器
type AdminExposureModuleHandler struct {
	db *gorm.DB
}

// NewAdminExposureModuleHandler 创建管理员脱敏练习模块处理器
func NewAdminExposureModuleHandler(db *gorm.DB) *AdminExposureModuleHandler {
	return &AdminExposureModuleHandler{db: db}
}

// GetModules 获取所有模块（管理员）
// GET /api/v1/admin/exposure/modules
func (h *AdminExposureModuleHandler) GetModules(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	keyword := c.Query("keyword")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := h.db.Model(&models.ExposureModule{})

	// 关键字搜索
	if keyword != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var total int64
	query.Count(&total)

	var modules []models.ExposureModule
	offset := (page - 1) * pageSize
	err := query.Order("display_order ASC, created_at DESC").
		Preload("Steps", func(db *gorm.DB) *gorm.DB {
			// 不使用 Select，直接查询所有字段，确保 JSONB 字段被正确查询
			return db.Order("step_order ASC")
		}).
		Offset(offset).
		Limit(pageSize).
		Find(&modules).Error

	if err != nil {
		response.Error(c, http.StatusInternalServerError, "获取模块列表失败: "+err.Error())
		return
	}

	// 处理 Steps 中 popup_configs 为 NULL 的情况
	// 确保 Steps 数组被初始化，避免 nil 导致的错误
	for i := range modules {
		if modules[i].Steps == nil {
			modules[i].Steps = []models.ExposureStep{}
		}
		for j := range modules[i].Steps {
			if modules[i].Steps[j].PopupConfigs == "" {
				modules[i].Steps[j].PopupConfigs = "[]"
			}
		}
	}

	response.Success(c, gin.H{
		"modules":   modules,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// GetModule 获取单个模块详情（管理员）
// GET /api/v1/admin/exposure/modules/:id
func (h *AdminExposureModuleHandler) GetModule(c *gin.Context) {
	moduleID := c.Param("id")
	if moduleID == "" {
		response.Error(c, http.StatusBadRequest, "模块ID不能为空")
		return
	}

	var module models.ExposureModule
	err := h.db.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		// 不使用 Select，直接查询所有字段，确保 JSONB 字段被正确查询
		return db.Order("step_order ASC")
	}).First(&module, "id = ?", moduleID).Error

	// 处理 Steps 中 popup_configs 为 NULL 的情况
	if err == nil {
		for i := range module.Steps {
			if module.Steps[i].PopupConfigs == "" {
				module.Steps[i].PopupConfigs = "[]"
			}
		}
	}

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "模块不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取模块失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{"module": module}, "获取成功")
}

// CreateModule 创建模块（管理员）
// POST /api/v1/admin/exposure/modules
func (h *AdminExposureModuleHandler) CreateModule(c *gin.Context) {
	var req struct {
		ID           string `json:"id" binding:"required"`
		Title        string `json:"title" binding:"required"`
		Description  string `json:"description" binding:"required"`
		Icon         string `json:"icon" binding:"required"`
		Color        string `json:"color" binding:"required"`
		DisplayOrder int    `json:"display_order"`
		IsActive     bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 检查ID是否已存在
	var count int64
	h.db.Model(&models.ExposureModule{}).Where("id = ?", req.ID).Count(&count)
	if count > 0 {
		response.Error(c, http.StatusBadRequest, "模块ID已存在")
		return
	}

	module := models.ExposureModule{
		ID:           req.ID,
		Title:        req.Title,
		Description:  req.Description,
		Icon:         req.Icon,
		Color:        req.Color,
		DisplayOrder: req.DisplayOrder,
		IsActive:     req.IsActive,
	}

	if err := h.db.Create(&module).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建模块失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{"module": module}, "创建成功")
}

// UpdateModule 更新模块（管理员）
// PUT /api/v1/admin/exposure/modules/:id
func (h *AdminExposureModuleHandler) UpdateModule(c *gin.Context) {
	moduleID := c.Param("id")
	if moduleID == "" {
		response.Error(c, http.StatusBadRequest, "模块ID不能为空")
		return
	}

	var req struct {
		Title        string `json:"title"`
		Description  string `json:"description"`
		Icon         string `json:"icon"`
		Color        string `json:"color"`
		DisplayOrder *int   `json:"display_order"`
		IsActive     *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 检查模块是否存在
	var module models.ExposureModule
	if err := h.db.First(&module, "id = ?", moduleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "模块不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "查询模块失败: "+err.Error())
		return
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Icon != "" {
		updates["icon"] = req.Icon
	}
	if req.Color != "" {
		updates["color"] = req.Color
	}
	if req.DisplayOrder != nil {
		updates["display_order"] = *req.DisplayOrder
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := h.db.Model(&module).Updates(updates).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新模块失败: "+err.Error())
		return
	}

	// 重新查询更新后的数据
	h.db.First(&module, "id = ?", moduleID)

	response.Success(c, gin.H{"module": module}, "更新成功")
}

// DeleteModule 删除模块（管理员）
// DELETE /api/v1/admin/exposure/modules/:id
func (h *AdminExposureModuleHandler) DeleteModule(c *gin.Context) {
	moduleID := c.Param("id")
	if moduleID == "" {
		response.Error(c, http.StatusBadRequest, "模块ID不能为空")
		return
	}

	// 检查模块是否存在
	var module models.ExposureModule
	if err := h.db.First(&module, "id = ?", moduleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "模块不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "查询模块失败: "+err.Error())
		return
	}

	// 删除模块（会级联删除步骤）
	if err := h.db.Delete(&module).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除模块失败: "+err.Error())
		return
	}

	response.Success(c, nil, "删除成功")
}

// GetModuleSteps 获取模块的所有步骤（管理员）
// GET /api/v1/admin/exposure/modules/:id/steps
func (h *AdminExposureModuleHandler) GetModuleSteps(c *gin.Context) {
	moduleID := c.Param("id")
	if moduleID == "" {
		response.Error(c, http.StatusBadRequest, "模块ID不能为空")
		return
	}

	var steps []models.ExposureStep
	// 直接查询所有字段，确保 JSONB 字段被正确查询
	err := h.db.Where("module_id = ?", moduleID).
		Order("step_order ASC").
		Find(&steps).Error

	if err != nil {
		response.Error(c, http.StatusInternalServerError, "获取步骤列表失败: "+err.Error())
		return
	}

	// 处理 popup_configs 为 NULL 的情况，设置为空数组 JSON
	// 强制设置字段值，确保字段在 JSON 序列化时被包含
	for i := range steps {
		// 如果 popup_configs 为空字符串或 NULL，设置为 '[]'
		if steps[i].PopupConfigs == "" {
			steps[i].PopupConfigs = "[]"
		}
	}

	response.Success(c, gin.H{"steps": steps}, "获取成功")
}

// CreateStep 创建步骤（管理员）
// POST /api/v1/admin/exposure/modules/:id/steps
func (h *AdminExposureModuleHandler) CreateStep(c *gin.Context) {
	moduleID := c.Param("id")
	if moduleID == "" {
		response.Error(c, http.StatusBadRequest, "模块ID不能为空")
		return
	}

	// 检查模块是否存在
	var module models.ExposureModule
	if err := h.db.First(&module, "id = ?", moduleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "模块不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "查询模块失败: "+err.Error())
		return
	}

	var req struct {
		StepOrder           int    `json:"step_order" binding:"required"`
		StepType            string `json:"step_type" binding:"required"`
		Title               string `json:"title" binding:"required"`
		Description         string `json:"description" binding:"required"`
		GuideContent        string `json:"guide_content"`
		ScenarioListTitle   string `json:"scenario_list_title"`
		ScenarioListContent string `json:"scenario_list_content"`
		PopupConfigs        string `json:"popup_configs"` // JSON字符串，包含多个弹窗配置
		Icon                string `json:"icon" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 检查步骤类型是否有效
	validTypes := []string{"approach", "conversation", "upload", "analysis", "profile", "community"}
	isValidType := false
	for _, t := range validTypes {
		if req.StepType == t {
			isValidType = true
			break
		}
	}
	if !isValidType {
		response.Error(c, http.StatusBadRequest, "无效的步骤类型")
		return
	}

	step := models.ExposureStep{
		ModuleID:            moduleID,
		StepOrder:           req.StepOrder,
		StepType:            req.StepType,
		Title:               req.Title,
		Description:         req.Description,
		GuideContent:        req.GuideContent,
		ScenarioListTitle:   req.ScenarioListTitle,
		ScenarioListContent: req.ScenarioListContent,
		PopupConfigs:        req.PopupConfigs,
		Icon:                req.Icon,
	}

	if err := h.db.Create(&step).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建步骤失败: "+err.Error())
		return
	}

	// 重新查询创建后的数据（包含所有字段）
	// 不使用 Select，直接查询所有字段，确保 JSONB 字段被正确查询
	if err := h.db.First(&step, "id = ?", step.ID).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询创建后的步骤失败: "+err.Error())
		return
	}

	// 处理 popup_configs 为 NULL 的情况
	if step.PopupConfigs == "" {
		step.PopupConfigs = "[]"
	}

	response.Success(c, gin.H{"step": step}, "创建成功")
}

// UpdateStep 更新步骤（管理员）
// PUT /api/v1/admin/exposure/steps/:step_id
func (h *AdminExposureModuleHandler) UpdateStep(c *gin.Context) {
	stepIDStr := c.Param("step_id")
	if stepIDStr == "" {
		response.Error(c, http.StatusBadRequest, "步骤ID不能为空")
		return
	}

	stepID, err := uuid.Parse(stepIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "步骤ID格式错误")
		return
	}

	var req struct {
		StepOrder           *int    `json:"step_order"`
		StepType            *string `json:"step_type"`
		Title               *string `json:"title"`
		Description         *string `json:"description"`
		GuideContent        *string `json:"guide_content"`
		ScenarioListTitle   *string `json:"scenario_list_title"`
		ScenarioListContent *string `json:"scenario_list_content"`
		PopupConfigs        *string `json:"popup_configs"` // JSON字符串，包含多个弹窗配置
		Icon                *string `json:"icon"`
	}

	// 先读取原始 JSON 数据
	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 将原始数据映射到结构体
	if val, ok := rawData["step_order"]; ok {
		if v, ok := val.(float64); ok {
			stepOrder := int(v)
			req.StepOrder = &stepOrder
		}
	}
	if val, ok := rawData["step_type"]; ok {
		if v, ok := val.(string); ok {
			req.StepType = &v
		}
	}
	if val, ok := rawData["title"]; ok {
		if v, ok := val.(string); ok {
			req.Title = &v
		}
	}
	if val, ok := rawData["description"]; ok {
		if v, ok := val.(string); ok {
			req.Description = &v
		}
	}
	if val, ok := rawData["guide_content"]; ok {
		if v, ok := val.(string); ok {
			req.GuideContent = &v
		}
	}
	if val, ok := rawData["scenario_list_title"]; ok {
		if v, ok := val.(string); ok {
			req.ScenarioListTitle = &v
		}
	}
	if val, ok := rawData["scenario_list_content"]; ok {
		if v, ok := val.(string); ok {
			req.ScenarioListContent = &v
		}
	}
	// 处理弹窗配置字段
	if val, exists := rawData["popup_configs"]; exists {
		v := "[]"
		if val != nil {
			if str, ok := val.(string); ok {
				v = str
			}
		}
		req.PopupConfigs = &v
	}
	if val, ok := rawData["icon"]; ok {
		if v, ok := val.(string); ok {
			req.Icon = &v
		}
	}

	// 检查步骤是否存在
	var step models.ExposureStep
	if err := h.db.First(&step, "id = ?", stepID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "步骤不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "查询步骤失败: "+err.Error())
		return
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.StepOrder != nil {
		updates["step_order"] = *req.StepOrder
	}
	if req.StepType != nil {
		updates["step_type"] = *req.StepType
	}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.GuideContent != nil {
		updates["guide_content"] = *req.GuideContent
	}
	if req.ScenarioListTitle != nil {
		updates["scenario_list_title"] = *req.ScenarioListTitle
	}
	if req.ScenarioListContent != nil {
		updates["scenario_list_content"] = *req.ScenarioListContent
	}
	if req.PopupConfigs != nil {
		updates["popup_configs"] = *req.PopupConfigs
	}
	if req.Icon != nil {
		updates["icon"] = *req.Icon
	}

	if len(updates) == 0 {
		response.Error(c, http.StatusBadRequest, "没有需要更新的字段")
		return
	}

	if err := h.db.Model(&step).Updates(updates).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新步骤失败: "+err.Error())
		return
	}

	// 重新查询更新后的数据（包含所有字段）
	// 不使用 Select，直接查询所有字段，确保 JSONB 字段被正确查询
	if err := h.db.First(&step, "id = ?", stepID).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询更新后的步骤失败: "+err.Error())
		return
	}

	// 处理 popup_configs 为 NULL 的情况
	if step.PopupConfigs == "" {
		step.PopupConfigs = "[]"
	}

	response.Success(c, gin.H{"step": step}, "更新成功")
}

// DeleteStep 删除步骤（管理员）
// DELETE /api/v1/admin/exposure/steps/:step_id
func (h *AdminExposureModuleHandler) DeleteStep(c *gin.Context) {
	stepIDStr := c.Param("step_id")
	if stepIDStr == "" {
		response.Error(c, http.StatusBadRequest, "步骤ID不能为空")
		return
	}

	stepID, err := uuid.Parse(stepIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "步骤ID格式错误")
		return
	}

	// 检查步骤是否存在
	var step models.ExposureStep
	if err := h.db.First(&step, "id = ?", stepID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "步骤不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "查询步骤失败: "+err.Error())
		return
	}

	// 删除步骤
	if err := h.db.Delete(&step).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除步骤失败: "+err.Error())
		return
	}

	response.Success(c, nil, "删除成功")
}

// BatchUpdateStepsOrder 批量更新步骤顺序（管理员）
// PUT /api/v1/admin/exposure/modules/:id/steps/order
func (h *AdminExposureModuleHandler) BatchUpdateStepsOrder(c *gin.Context) {
	moduleID := c.Param("id")
	if moduleID == "" {
		response.Error(c, http.StatusBadRequest, "模块ID不能为空")
		return
	}

	var req struct {
		Steps []struct {
			ID    string `json:"id" binding:"required"`
			Order int    `json:"order" binding:"required"`
		} `json:"steps" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 开始事务
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, item := range req.Steps {
		stepID, err := uuid.Parse(item.ID)
		if err != nil {
			tx.Rollback()
			response.Error(c, http.StatusBadRequest, "步骤ID格式错误")
			return
		}

		if err := tx.Model(&models.ExposureStep{}).
			Where("id = ? AND module_id = ?", stepID, moduleID).
			Update("step_order", item.Order).Error; err != nil {
			tx.Rollback()
			response.Error(c, http.StatusInternalServerError, "更新步骤顺序失败: "+err.Error())
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "提交事务失败: "+err.Error())
		return
	}

	response.Success(c, nil, "更新成功")
}

// BatchUpdateModulesOrder 批量更新模块顺序（管理员）
// PUT /api/v1/admin/exposure/modules/order
func (h *AdminExposureModuleHandler) BatchUpdateModulesOrder(c *gin.Context) {
	var req struct {
		Modules []struct {
			ID    string `json:"id" binding:"required"`
			Order int    `json:"order" binding:"required"`
		} `json:"modules" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 开始事务
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, item := range req.Modules {
		// 检查模块是否存在
		var module models.ExposureModule
		if err := tx.First(&module, "id = ?", item.ID).Error; err != nil {
			tx.Rollback()
			if err == gorm.ErrRecordNotFound {
				response.Error(c, http.StatusNotFound, "模块不存在: "+item.ID)
				return
			}
			response.Error(c, http.StatusInternalServerError, "查询模块失败: "+err.Error())
			return
		}

		// 更新模块的 display_order
		if err := tx.Model(&module).Update("display_order", item.Order).Error; err != nil {
			tx.Rollback()
			response.Error(c, http.StatusInternalServerError, "更新模块顺序失败: "+err.Error())
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "提交事务失败: "+err.Error())
		return
	}

	response.Success(c, nil, "更新成功")
}
