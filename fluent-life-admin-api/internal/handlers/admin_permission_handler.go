package handlers

import (
	"fluent-life-admin-api/internal/models"
	"fluent-life-admin-api/pkg/response"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AdminPermissionHandler struct {
	db *gorm.DB
}

func NewAdminPermissionHandler(db *gorm.DB) *AdminPermissionHandler {
	return &AdminPermissionHandler{db: db}
}

// ============ 角色管理 ============

// GetRoles 获取角色列表
// GET /api/v1/admin/roles?page=1&page_size=20
func (h *AdminPermissionHandler) GetRoles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	var roles []models.Role
	var total int64

	h.db.Model(&models.Role{}).Count(&total)

	if err := h.db.Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&roles).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "获取角色列表失败")
		return
	}

	response.Success(c, gin.H{
		"roles":     roles,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// GetRole 获取角色详情
// GET /api/v1/admin/roles/:id
func (h *AdminPermissionHandler) GetRole(c *gin.Context) {
	id := c.Param("id")

	var role models.Role
	if err := h.db.Where("id = ?", id).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "角色不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取角色失败")
		return
	}

	response.Success(c, role, "获取成功")
}

// CreateRole 创建角色
// POST /api/v1/admin/roles
func (h *AdminPermissionHandler) CreateRole(c *gin.Context) {
	var req struct {
		Name        string   `json:"name" binding:"required"`
		Code        string   `json:"code" binding:"required"`
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 检查角色代码是否已存在
	var existingRole models.Role
	if err := h.db.Where("code = ?", req.Code).First(&existingRole).Error; err == nil {
		response.Error(c, http.StatusBadRequest, "角色代码已存在")
		return
	}

	// 将权限数组转换为 JSONB
	permissionsJSONB := models.JSONB{}
	if req.Permissions != nil {
		for _, perm := range req.Permissions {
			permissionsJSONB[perm] = true
		}
	}

	role := models.Role{
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Permissions: permissionsJSONB,
	}

	if err := h.db.Create(&role).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建角色失败")
		return
	}

	response.Success(c, role, "创建成功")
}

// UpdateRole 更新角色
// PUT /api/v1/admin/roles/:id
func (h *AdminPermissionHandler) UpdateRole(c *gin.Context) {
	id := c.Param("id")

	var role models.Role
	if err := h.db.Where("id = ?", id).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "角色不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取角色失败")
		return
	}

	var req struct {
		Name        *string   `json:"name"`
		Code        *string   `json:"code"`
		Description *string   `json:"description"`
		Permissions *[]string `json:"permissions"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	if req.Name != nil {
		role.Name = *req.Name
	}
	if req.Code != nil {
		// 检查角色代码是否被其他角色使用
		var existingRole models.Role
		if err := h.db.Where("code = ? AND id != ?", *req.Code, id).First(&existingRole).Error; err == nil {
			response.Error(c, http.StatusBadRequest, "角色代码已被使用")
			return
		}
		role.Code = *req.Code
	}
	if req.Description != nil {
		role.Description = *req.Description
	}
	if req.Permissions != nil {
		permissionsJSONB := models.JSONB{}
		for _, perm := range *req.Permissions {
			permissionsJSONB[perm] = true
		}
		role.Permissions = permissionsJSONB
	}

	if err := h.db.Save(&role).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新角色失败")
		return
	}

	response.Success(c, role, "更新成功")
}

// DeleteRole 删除角色
// DELETE /api/v1/admin/roles/:id
func (h *AdminPermissionHandler) DeleteRole(c *gin.Context) {
	id := c.Param("id")

	var role models.Role
	if err := h.db.Where("id = ?", id).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "角色不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取角色失败")
		return
	}

	// 检查是否有用户使用该角色
	var userCount int64
	h.db.Model(&models.User{}).Where("role = ?", role.Code).Count(&userCount)
	if userCount > 0 {
		response.Error(c, http.StatusBadRequest, "该角色正在被使用，无法删除")
		return
	}

	if err := h.db.Delete(&role).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除角色失败")
		return
	}

	response.Success(c, nil, "删除成功")
}

// ============ 菜单管理 ============

// GetMenus 获取菜单列表
// GET /api/v1/admin/menus?page=1&page_size=20
func (h *AdminPermissionHandler) GetMenus(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	var menus []models.Menu
	var total int64

	// 只计算顶级菜单的数量（parent_id IS NULL）
	h.db.Model(&models.Menu{}).Where("parent_id IS NULL").Count(&total)

	if err := h.db.Where("parent_id IS NULL").
		Order("sort ASC, created_at ASC").
		Preload("Children").
		Limit(pageSize).
		Offset(offset).
		Find(&menus).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "获取菜单列表失败")
		return
	}

	response.Success(c, gin.H{
		"menus":     menus,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// GetMenu 获取菜单详情
// GET /api/v1/admin/menus/:id
func (h *AdminPermissionHandler) GetMenu(c *gin.Context) {
	id := c.Param("id")

	var menu models.Menu
	if err := h.db.Where("id = ?", id).Preload("Children").First(&menu).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "菜单不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取菜单失败")
		return
	}

	response.Success(c, menu, "获取成功")
}

// CreateMenu 创建菜单
// POST /api/v1/admin/menus
func (h *AdminPermissionHandler) CreateMenu(c *gin.Context) {
	var req struct {
		Name     string     `json:"name" binding:"required"`
		Path     string     `json:"path"`
		Icon     string     `json:"icon"`
		ParentID *uuid.UUID `json:"parent_id"`
		Sort     int        `json:"sort"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	menu := models.Menu{
		Name:     req.Name,
		Path:     req.Path,
		Icon:     req.Icon,
		ParentID: req.ParentID,
		Sort:     req.Sort,
	}

	if err := h.db.Create(&menu).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建菜单失败")
		return
	}

	response.Success(c, menu, "创建成功")
}

// UpdateMenu 更新菜单
// PUT /api/v1/admin/menus/:id
func (h *AdminPermissionHandler) UpdateMenu(c *gin.Context) {
	id := c.Param("id")

	var menu models.Menu
	if err := h.db.Where("id = ?", id).First(&menu).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "菜单不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取菜单失败")
		return
	}

	var req struct {
		Name     *string    `json:"name"`
		Path     *string    `json:"path"`
		Icon     *string    `json:"icon"`
		ParentID *uuid.UUID `json:"parent_id"`
		Sort     *int       `json:"sort"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	if req.Name != nil {
		menu.Name = *req.Name
	}
	if req.Path != nil {
		menu.Path = *req.Path
	}
	if req.Icon != nil {
		menu.Icon = *req.Icon
	}
	if req.ParentID != nil {
		menu.ParentID = req.ParentID
	}
	if req.Sort != nil {
		menu.Sort = *req.Sort
	}

	if err := h.db.Save(&menu).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新菜单失败")
		return
	}

	response.Success(c, menu, "更新成功")
}

// DeleteMenu 删除菜单
// DELETE /api/v1/admin/menus/:id
func (h *AdminPermissionHandler) DeleteMenu(c *gin.Context) {
	id := c.Param("id")

	var menu models.Menu
	if err := h.db.Where("id = ?", id).First(&menu).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "菜单不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取菜单失败")
		return
	}

	// 检查是否有子菜单
	var childrenCount int64
	h.db.Model(&models.Menu{}).Where("parent_id = ?", id).Count(&childrenCount)
	if childrenCount > 0 {
		response.Error(c, http.StatusBadRequest, "该菜单下有子菜单，请先删除子菜单")
		return
	}

	if err := h.db.Delete(&menu).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除菜单失败")
		return
	}

	response.Success(c, nil, "删除成功")
}
