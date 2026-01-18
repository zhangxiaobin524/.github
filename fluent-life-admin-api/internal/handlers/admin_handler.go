package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"fluent-life-admin-api/internal/models"
	"fluent-life-admin-api/pkg/auth" // Import auth package
	"fluent-life-admin-api/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt" // Add bcrypt for password hashing
	"gorm.io/gorm"
)

type AdminHandler struct {
	db *gorm.DB
}

func NewAdminHandler(db *gorm.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

// logOperation 记录管理员操作日志
func (h *AdminHandler) logOperation(c *gin.Context, action, resource, resourceID, details, status string) {
	userID, _ := c.Get("userID")
	username, _ := c.Get("username")
	userRole, _ := c.Get("userRole")

	logEntry := models.OperationLog{
		UserID:    userID.(uuid.UUID),
		Username:  username.(string),
		UserRole:  userRole.(string),
		Action:    action,
		Resource:  resource,
		ResourceID: resourceID,
		Details:   details,
		Status:    status,
	}
	h.db.Create(&logEntry) // Log asynchronously, errors here should not block main operation
}

// isValidRole 检查角色是否有效
func isValidRole(role string) bool {
	switch role {
	case "user", "admin", "super_admin":
		return true
	default:
		return false
	}
}

// CreateUser 创建新用户
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req struct {
		Username string  `json:"username" binding:"required"`
		Email    *string `json:"email"`
		Phone    *string `json:"phone"`
		Password string  `json:"password" binding:"required,min=6"`
		Status   int     `json:"status"`
		Gender   *string `json:"gender"`
		Role     *string `json:"role"` // Add Role field
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// Validate Role if provided
	if req.Role != nil && !isValidRole(*req.Role) {
		response.Error(c, http.StatusBadRequest, "无效的用户角色")
		return
	}

	// 检查用户名是否已存在
	var existingUser models.User
	if h.db.Where("username = ?", req.Username).First(&existingUser).Error == nil {
		response.Error(c, http.StatusConflict, "用户名已存在")
		return
	}

	// 密码哈希
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "密码哈希失败")
		return
	}

	user := models.User{
		Username:     req.Username,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hashedPassword),
		Status:       req.Status,
		Gender:       req.Gender,
	}

	// Assign Role if provided, otherwise model default "user" will be used
	if req.Role != nil {
		user.Role = *req.Role
	}

	if err := h.db.Create(&user).Error; err != nil {
		h.logOperation(c, "CreateUser", "User", "", "创建用户失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "创建用户失败: "+err.Error())
		return
	}

	h.logOperation(c, "CreateUser", "User", user.ID.String(), "用户创建成功", "Success")
	response.Success(c, user, "用户创建成功")
}

// UpdateUser 更新用户信息
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Username *string `json:"username"`
		Email    *string `json:"email"`
		Phone    *string `json:"phone"`
		Password *string `json:"password"` // 可选，用于重置密码
		Status   *int    `json:"status"`
		Gender   *string `json:"gender"`
		Role     *string `json:"role"` // Add Role field
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// Validate Role if provided
	if req.Role != nil && !isValidRole(*req.Role) {
		response.Error(c, http.StatusBadRequest, "无效的用户角色")
		return
	}

	var user models.User
	if err := h.db.Where("id = ?", id).First(&user).Error; err != nil {
		response.Error(c, http.StatusNotFound, "用户不存在")
		return
	}

	// 更新字段
	if req.Username != nil {
		// 检查新用户名是否已存在且不属于当前用户
		var existingUser models.User
		if h.db.Where("username = ? AND id != ?", *req.Username, id).First(&existingUser).Error == nil {
			response.Error(c, http.StatusConflict, "用户名已存在")
			return
		}
		user.Username = *req.Username
	}
	if req.Email != nil {
		user.Email = req.Email
	}
	if req.Phone != nil {
		user.Phone = req.Phone
	}
	if req.Status != nil {
		user.Status = *req.Status
	}
	if req.Gender != nil {
		user.Gender = req.Gender
	}
	if req.Role != nil { // Update Role field
		user.Role = *req.Role
	}
	if req.Password != nil && len(*req.Password) >= 6 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "密码哈希失败")
			return
		}
		user.PasswordHash = string(hashedPassword)
	} else if req.Password != nil && len(*req.Password) < 6 {
		response.Error(c, http.StatusBadRequest, "密码长度不能少于6位")
		return
	}

	if err := h.db.Save(&user).Error; err != nil {
		h.logOperation(c, "UpdateUser", "User", user.ID.String(), "更新用户失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "更新用户失败: "+err.Error())
		return
	}

	h.logOperation(c, "UpdateUser", "User", user.ID.String(), "用户更新成功", "Success")
	response.Success(c, user, "用户更新成功")
}

// 管理员登录
func (h *AdminHandler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	var user models.User
	// 查找用户，并确保其角色是admin或super_admin
	if err := h.db.Where("username = ? AND (role = ? OR role = ?)", req.Username, "admin", "super_admin").First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusUnauthorized, "用户名或密码错误，或无管理员权限")
			return
		}
		response.Error(c, http.StatusInternalServerError, "数据库查询失败")
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		response.Error(c, http.StatusUnauthorized, "用户名或密码错误，或无管理员权限")
		return
	}

	// 生成JWT Token
	token, err := auth.GenerateToken(user.ID, user.Role)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "生成认证令牌失败")
		return
	}

	response.Success(c, gin.H{
		"token":    token,
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
	}, "登录成功")
}

// 获取用户列表
func (h *AdminHandler) GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var users []models.User
	var total int64

	query := h.db.Model(&models.User{})
	
	// 搜索
	if keyword := c.Query("keyword"); keyword != "" {
		query = query.Where("username LIKE ? OR email LIKE ? OR phone LIKE ?", 
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)
	
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&users).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"users": users,
		"total": total,
		"page": page,
		"page_size": pageSize,
	}, "获取成功")
}

// 获取用户详情
func (h *AdminHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	
	var user models.User
	if err := h.db.Where("id = ?", id).First(&user).Error; err != nil {
		response.Error(c, http.StatusNotFound, "用户不存在")
		return
	}

	response.Success(c, user, "获取成功")
}

// 删除用户
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.db.Where("id = ?", id).Delete(&models.User{}).Error; err != nil {
		h.logOperation(c, "DeleteUser", "User", id, "删除用户失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	h.logOperation(c, "DeleteUser", "User", id, "删除用户成功", "Success")
	response.Success(c, nil, "删除成功")
}

// CreatePost 创建帖子
func (h *AdminHandler) CreatePost(c *gin.Context) {
	var req struct {
		Content string `json:"content" binding:"required"`
		Tag     string `json:"tag"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "用户ID未找到")
		return
	}
	
	// 打印用户ID以验证取值
	log.Printf("从上下文获取的userID: %v, 类型: %T", userID, userID)
	
	post := models.Post{
		UserID:  userID.(uuid.UUID),
		Content: req.Content,
		Tag:     req.Tag,
	}

	if err := h.db.Create(&post).Error; err != nil {
		h.logOperation(c, "CreatePost", "Post", "", "创建帖子失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "创建帖子失败: "+err.Error())
		return
	}

	h.logOperation(c, "CreatePost", "Post", post.ID.String(), "帖子创建成功", "Success")
	response.Success(c, post, "帖子创建成功")
}

// UpdatePost 更新帖子
func (h *AdminHandler) UpdatePost(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Content *string `json:"content"`
		Tag     *string `json:"tag"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	var post models.Post
	if err := h.db.Where("id = ?", id).First(&post).Error; err != nil {
		response.Error(c, http.StatusNotFound, "帖子不存在")
		return
	}

	if req.Content != nil {
		post.Content = *req.Content
	}
	if req.Tag != nil {
		post.Tag = *req.Tag
	}

	if err := h.db.Save(&post).Error; err != nil {
		h.logOperation(c, "UpdatePost", "Post", post.ID.String(), "更新帖子失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "更新帖子失败: "+err.Error())
		return
	}

	h.logOperation(c, "UpdatePost", "Post", post.ID.String(), "帖子更新成功", "Success")
	response.Success(c, post, "帖子更新成功")
}

// 删除所有绕口令
func (h *AdminHandler) DeleteAllTongueTwisters(c *gin.Context) {
	if err := h.db.Where("1 = 1").Delete(&models.TongueTwister{}).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除所有绕口令失败")
		return
	}
	response.Success(c, nil, "所有绕口令删除成功")
}

// 获取帖子列表
func (h *AdminHandler) GetPosts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var posts []models.Post
	var total int64

	query := h.db.Model(&models.Post{}).Preload("User")
	
	// 搜索
	if keyword := c.Query("keyword"); keyword != "" {
		query = query.Where("content LIKE ?", "%"+keyword+"%")
	}

	query.Count(&total)
	
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&posts).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"posts": posts,
		"total": total,
		"page": page,
		"page_size": pageSize,
	}, "获取成功")
}

// 获取帖子详情
func (h *AdminHandler) GetPost(c *gin.Context) {
	id := c.Param("id")
	
	var post models.Post
	if err := h.db.Preload("User").Preload("Comments.User").Where("id = ?", id).First(&post).Error; err != nil {
		response.Error(c, http.StatusNotFound, "帖子不存在")
		return
	}

	response.Success(c, post, "获取成功")
}

// 删除帖子 (支持批量删除)
func (h *AdminHandler) DeletePost(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供帖子ID列表")
		return
	}

	tx := h.db.Begin()
	if tx.Error != nil {
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	// 先删除相关的点赞记录
	if err := tx.Where("post_id IN ?", req.IDs).Delete(&models.PostLike{}).Error; err != nil {
		tx.Rollback()
		response.Error(c, http.StatusInternalServerError, "删除相关点赞失败")
		return
	}

	// 再删除相关的评论记录
	if err := tx.Where("post_id IN ?", req.IDs).Delete(&models.Comment{}).Error; err != nil {
		tx.Rollback()
		response.Error(c, http.StatusInternalServerError, "删除相关评论失败")
		return
	}

	// 再删除相关的收藏记录
	if err := tx.Where("post_id IN ?", req.IDs).Delete(&models.PostCollection{}).Error; err != nil {
		tx.Rollback()
		response.Error(c, http.StatusInternalServerError, "删除相关收藏失败")
		return
	}

	// 最后删除帖子
	if err := tx.Where("id IN ?", req.IDs).Delete(&models.Post{}).Error; err != nil {
		tx.Rollback()
		h.logOperation(c, "DeletePost", "Post", strings.Join(req.IDs, ","), "删除帖子失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除帖子失败")
		return
	}

	tx.Commit()
	h.logOperation(c, "DeletePost", "Post", strings.Join(req.IDs, ","), "删除帖子成功", "Success")
	response.Success(c, nil, "删除成功")
}

// 获取房间列表
func (h *AdminHandler) GetRooms(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var rooms []models.PracticeRoom
	var total int64

	query := h.db.Model(&models.PracticeRoom{}).Preload("User")
	
	// 搜索
	if keyword := c.Query("keyword"); keyword != "" {
		query = query.Where("title LIKE ? OR theme LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 筛选活跃状态
	if isActive := c.Query("is_active"); isActive != "" {
		active := isActive == "true"
		query = query.Where("is_active = ?", active)
	}

	query.Count(&total)
	
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&rooms).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"rooms": rooms,
		"total": total,
		"page": page,
		"page_size": pageSize,
	}, "获取成功")
}

// 获取房间详情
func (h *AdminHandler) GetRoom(c *gin.Context) {
	id := c.Param("id")
	
	var room models.PracticeRoom
	if err := h.db.Preload("User").Preload("Members.User").Where("id = ?", id).First(&room).Error; err != nil {
		response.Error(c, http.StatusNotFound, "房间不存在")
		return
	}

	response.Success(c, room, "获取成功")
}

// 删除房间 (支持批量删除)
func (h *AdminHandler) DeleteRoom(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供房间ID列表")
		return
	}

	tx := h.db.Begin()
	if tx.Error != nil {
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	// 先删除相关的房间成员记录
	if err := tx.Where("room_id IN ?", req.IDs).Delete(&models.PracticeRoomMember{}).Error; err != nil {
		tx.Rollback()
		response.Error(c, http.StatusInternalServerError, "删除相关房间成员失败")
		return
	}

	// 最后删除房间
	if err := tx.Where("id IN ?", req.IDs).Delete(&models.PracticeRoom{}).Error; err != nil {
		tx.Rollback()
		h.logOperation(c, "DeleteRoom", "PracticeRoom", strings.Join(req.IDs, ","), "删除房间失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除房间失败")
		return
	}

	tx.Commit()
	h.logOperation(c, "DeleteRoom", "PracticeRoom", strings.Join(req.IDs, ","), "删除房间成功", "Success")
	response.Success(c, nil, "删除成功")
}

// 关闭/开启房间
func (h *AdminHandler) ToggleRoom(c *gin.Context) {
	id := c.Param("id")
	
	var room models.PracticeRoom
	if err := h.db.Where("id = ?", id).First(&room).Error; err != nil {
		response.Error(c, http.StatusNotFound, "房间不存在")
		return
	}

	room.IsActive = !room.IsActive
	if err := h.db.Save(&room).Error; err != nil {
		h.logOperation(c, "ToggleRoom", "PracticeRoom", room.ID.String(), "切换房间状态失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "操作失败")
		return
	}

	h.logOperation(c, "ToggleRoom", "PracticeRoom", room.ID.String(), "切换房间状态成功", "Success")
	response.Success(c, room, "操作成功")
}

// CreateRoom 创建练习室
func (h *AdminHandler) CreateRoom(c *gin.Context) {
	var req struct {
		Title       string `json:"title" binding:"required"`
		Theme       string `json:"theme" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Description string `json:"description"`
		MaxMembers  int    `json:"max_members"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "用户ID未找到")
		return
	}

	// 打印用户ID以验证取值
	log.Printf("从上下文获取的userID: %v, 类型: %T", userID, userID)

	room := models.PracticeRoom{
		UserID:      userID.(uuid.UUID),
		Title:       req.Title,
		Theme:       req.Theme,
		Type:        req.Type,
		Description: req.Description,
		MaxMembers:  req.MaxMembers,
		IsActive:    true, // 默认创建时是活跃状态
		CurrentMembers: 1, // 创建者默认为第一个成员
	}

	if err := h.db.Create(&room).Error; err != nil {
		h.logOperation(c, "CreateRoom", "PracticeRoom", "", "创建练习室失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "创建练习室失败: "+err.Error())
		return
	}

	h.logOperation(c, "CreateRoom", "PracticeRoom", room.ID.String(), "练习室创建成功", "Success")
	response.Success(c, room, "练习室创建成功")
}

// UpdateRoom 更新练习室
func (h *AdminHandler) UpdateRoom(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Title       *string `json:"title"`
		Theme       *string `json:"theme"`
		Type        *string `json:"type"`
		Description *string `json:"description"`
		MaxMembers  *int    `json:"max_members"`
		IsActive    *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	var room models.PracticeRoom
	if err := h.db.Where("id = ?", id).First(&room).Error; err != nil {
		response.Error(c, http.StatusNotFound, "练习室不存在")
		return
	}

	if req.Title != nil {
		room.Title = *req.Title
	}
	if req.Theme != nil {
		room.Theme = *req.Theme
	}
	if req.Type != nil {
		room.Type = *req.Type
	}
	if req.Description != nil {
		room.Description = *req.Description
	}
	if req.MaxMembers != nil {
		room.MaxMembers = *req.MaxMembers
	}
	if req.IsActive != nil {
		room.IsActive = *req.IsActive
	}

	if err := h.db.Save(&room).Error; err != nil {
		h.logOperation(c, "UpdateRoom", "PracticeRoom", room.ID.String(), "更新练习室失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "更新练习室失败: "+err.Error())
		return
	}

	h.logOperation(c, "UpdateRoom", "PracticeRoom", room.ID.String(), "练习室更新成功", "Success")
	response.Success(c, room, "练习室更新成功")
}

// CreateAchievement 创建成就
func (h *AdminHandler) CreateAchievement(c *gin.Context) {
	var req struct {
		UserID          string `json:"user_id" binding:"required"`
		AchievementType string `json:"achievement_type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "无效的用户ID")
		return
	}

	// 检查成就是否已存在，避免重复创建
	var existingAchievement models.Achievement
	if h.db.Where("user_id = ? AND achievement_type = ?", userID, req.AchievementType).First(&existingAchievement).Error == nil {
		response.Error(c, http.StatusConflict, "该用户已拥有此成就")
		return
	}

	achievement := models.Achievement{
		UserID:          userID,
		AchievementType: req.AchievementType,
	}

	if err := h.db.Create(&achievement).Error; err != nil {
		h.logOperation(c, "CreateAchievement", "Achievement", "", "创建成就失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "创建成就失败: "+err.Error())
		return
	}

	h.logOperation(c, "CreateAchievement", "Achievement", achievement.ID.String(), "成就创建成功", "Success")
	response.Success(c, achievement, "成就创建成功")
}

// GetAchievements 获取成就列表
func (h *AdminHandler) GetAchievements(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var achievements []models.Achievement
	var total int64

	query := h.db.Model(&models.Achievement{}).Preload("User")

	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// 按成就类型筛选
	if achievementType := c.Query("achievement_type"); achievementType != "" {
		query = query.Where("achievement_type = ?", achievementType)
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("unlocked_at DESC").Find(&achievements).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"achievements": achievements,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
	}, "获取成功")
}

// GetAchievement 获取成就详情
func (h *AdminHandler) GetAchievement(c *gin.Context) {
	id := c.Param("id")

	var achievement models.Achievement
	if err := h.db.Preload("User").Where("id = ?", id).First(&achievement).Error; err != nil {
		response.Error(c, http.StatusNotFound, "成就不存在")
		return
	}

	response.Success(c, achievement, "获取成功")
}

// DeleteAchievement 删除成就
func (h *AdminHandler) DeleteAchievement(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.Where("id = ?", id).Delete(&models.Achievement{}).Error; err != nil {
		h.logOperation(c, "DeleteAchievement", "Achievement", id, "删除成就失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	h.logOperation(c, "DeleteAchievement", "Achievement", id, "删除成就成功", "Success")
	response.Success(c, nil, "删除成功")
}

// CreateMeditationProgress 创建冥想进度
func (h *AdminHandler) CreateMeditationProgress(c *gin.Context) {
	var req struct {
		UserID        string `json:"user_id" binding:"required"`
		Stage         int    `json:"stage" binding:"required,min=1,max=3"`
		CompletedDays int    `json:"completed_days"`
		Unlocked      bool   `json:"unlocked"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "无效的用户ID")
		return
	}

	// 检查冥想进度是否已存在，避免重复创建
	var existingProgress models.MeditationProgress
	if h.db.Where("user_id = ? AND stage = ?", userID, req.Stage).First(&existingProgress).Error == nil {
		response.Error(c, http.StatusConflict, "该用户在此阶段已有冥想进度记录")
		return
	}

	progress := models.MeditationProgress{
		UserID:        userID,
		Stage:         req.Stage,
		CompletedDays: req.CompletedDays,
		Unlocked:      req.Unlocked,
	}

	if err := h.db.Create(&progress).Error; err != nil {
		h.logOperation(c, "CreateMeditationProgress", "MeditationProgress", "", "创建冥想进度失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "创建冥想进度失败: "+err.Error())
		return
	}

	h.logOperation(c, "CreateMeditationProgress", "MeditationProgress", progress.ID.String(), "冥想进度创建成功", "Success")
	response.Success(c, progress, "冥想进度创建成功")
}

// GetMeditationProgresses 获取冥想进度列表
func (h *AdminHandler) GetMeditationProgresses(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var progresses []models.MeditationProgress
	var total int64

	query := h.db.Model(&models.MeditationProgress{})

	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// 按阶段筛选
	if stage := c.Query("stage"); stage != "" {
		query = query.Where("stage = ?", stage)
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&progresses).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{
		"progresses": progresses,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
	}, "获取成功")
}

// GetMeditationProgress 获取冥想进度详情
func (h *AdminHandler) GetMeditationProgress(c *gin.Context) {
	id := c.Param("id")

	var progress models.MeditationProgress
	if err := h.db.Preload("User").Where("id = ?", id).First(&progress).Error; err != nil {
		response.Error(c, http.StatusNotFound, "冥想进度不存在")
		return
	}

	response.Success(c, progress, "获取成功")
}

// UpdateMeditationProgress 更新冥想进度
func (h *AdminHandler) UpdateMeditationProgress(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Stage         *int  `json:"stage" binding:"omitempty,min=1,max=3"`
		CompletedDays *int  `json:"completed_days"`
		Unlocked      *bool `json:"unlocked"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	var progress models.MeditationProgress
	if err := h.db.Where("id = ?", id).First(&progress).Error; err != nil {
		response.Error(c, http.StatusNotFound, "冥想进度不存在")
		return
	}

	if req.Stage != nil {
		progress.Stage = *req.Stage
	}
	if req.CompletedDays != nil {
		progress.CompletedDays = *req.CompletedDays
	}
	if req.Unlocked != nil {
		progress.Unlocked = *req.Unlocked
	}

	if err := h.db.Save(&progress).Error; err != nil {
		h.logOperation(c, "UpdateMeditationProgress", "MeditationProgress", progress.ID.String(), "更新冥想进度失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "更新冥想进度失败: "+err.Error())
		return
	}

	h.logOperation(c, "UpdateMeditationProgress", "MeditationProgress", progress.ID.String(), "冥想进度更新成功", "Success")
	response.Success(c, progress, "冥想进度更新成功")
}

// DeleteMeditationProgress 删除冥想进度
func (h *AdminHandler) DeleteMeditationProgress(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.Where("id = ?", id).Delete(&models.MeditationProgress{}).Error; err != nil {
		h.logOperation(c, "DeleteMeditationProgress", "MeditationProgress", id, "删除冥想进度失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	h.logOperation(c, "DeleteMeditationProgress", "MeditationProgress", id, "删除冥想进度成功", "Success")
	response.Success(c, nil, "删除成功")
}

// GetAIConversations 获取AI对话列表
func (h *AdminHandler) GetAIConversations(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var conversations []models.AIConversation
	var total int64

	query := h.db.Model(&models.AIConversation{}).Preload("User")

	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&conversations).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"conversations": conversations,
		"total":         total,
		"page":          page,
		"page_size":     pageSize,
	}, "获取成功")
}

// GetAIConversation 获取AI对话详情
func (h *AdminHandler) GetAIConversation(c *gin.Context) {
	id := c.Param("id")

	var conversation models.AIConversation
	if err := h.db.Preload("User").Where("id = ?", id).First(&conversation).Error; err != nil {
		response.Error(c, http.StatusNotFound, "AI对话不存在")
		return
	}

	response.Success(c, conversation, "获取成功")
}

// DeleteAIConversation 删除AI对话 (支持批量删除)
func (h *AdminHandler) DeleteAIConversation(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供AI对话ID列表")
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.AIConversation{}).Error; err != nil {
		h.logOperation(c, "DeleteAIConversation", "AIConversation", strings.Join(req.IDs, ","), "删除AI对话失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除AI对话失败")
		return
	}

	h.logOperation(c, "DeleteAIConversation", "AIConversation", strings.Join(req.IDs, ","), "删除AI对话成功", "Success")
	response.Success(c, nil, "删除AI对话成功")
}

// GetVerificationCodes 获取验证码列表
func (h *AdminHandler) GetVerificationCodes(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var codes []models.VerificationCode
	var total int64

	query := h.db.Model(&models.VerificationCode{})

	// 按标识符筛选 (手机号/邮箱)
	if identifier := c.Query("identifier"); identifier != "" {
		query = query.Where("identifier LIKE ?", "%"+identifier+"%")
	}

	// 按类型筛选 (register/login)
	if codeType := c.Query("type"); codeType != "" {
		query = query.Where("type = ?", codeType)
	}

	// 按是否已使用筛选
	if used := c.Query("used"); used != "" {
		isUsed := used == "true"
		query = query.Where("used = ?", isUsed)
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&codes).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"codes":     codes,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// GetVerificationCode 获取验证码详情
func (h *AdminHandler) GetVerificationCode(c *gin.Context) {
	id := c.Param("id")

	var code models.VerificationCode
	if err := h.db.Where("id = ?", id).First(&code).Error; err != nil {
		response.Error(c, http.StatusNotFound, "验证码不存在")
		return
	}

	response.Success(c, code, "获取成功")
}

// DeleteVerificationCode 删除验证码 (支持批量删除)
func (h *AdminHandler) DeleteVerificationCode(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供验证码ID列表")
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.VerificationCode{}).Error; err != nil {
		h.logOperation(c, "DeleteVerificationCode", "VerificationCode", strings.Join(req.IDs, ","), "删除验证码失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除验证码失败")
		return
	}

	h.logOperation(c, "DeleteVerificationCode", "VerificationCode", strings.Join(req.IDs, ","), "删除验证码成功", "Success")
	response.Success(c, nil, "删除验证码成功")
}

// 获取训练统计
func (h *AdminHandler) GetTrainingStats(c *gin.Context) {
	var stats struct {
		TotalRecords    int64 `json:"total_records"`
		TotalUsers      int64 `json:"total_users"`
		MeditationCount int64 `json:"meditation_count"`
		AirflowCount    int64 `json:"airflow_count"`
		ExposureCount   int64 `json:"exposure_count"`
		PracticeCount   int64 `json:"practice_count"`
	}

	h.db.Model(&models.TrainingRecord{}).Count(&stats.TotalRecords)
	h.db.Model(&models.User{}).Count(&stats.TotalUsers)
	h.db.Model(&models.TrainingRecord{}).Where("type = ?", "meditation").Count(&stats.MeditationCount)
	h.db.Model(&models.TrainingRecord{}).Where("type = ?", "airflow").Count(&stats.AirflowCount)
	h.db.Model(&models.TrainingRecord{}).Where("type = ?", "exposure").Count(&stats.ExposureCount)
	h.db.Model(&models.TrainingRecord{}).Where("type = ?", "practice").Count(&stats.PracticeCount)

	response.Success(c, stats, "获取成功")
}

// 获取训练记录列表
func (h *AdminHandler) GetTrainingRecords(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var records []models.TrainingRecord
	var total int64

	query := h.db.Model(&models.TrainingRecord{}).Preload("User")
	
	// 按类型筛选
	if recordType := c.Query("type"); recordType != "" {
		query = query.Where("type = ?", recordType)
	}

	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// 按日期范围筛选
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("timestamp >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("timestamp <= ?", endDate)
	}

	query.Count(&total)
	
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&records).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"records": records,
		"total": total,
		"page": page,
		"page_size": pageSize,
	}, "获取成功")
}

// 获取训练记录详情
func (h *AdminHandler) GetTrainingRecord(c *gin.Context) {
	id := c.Param("id")
	
	var record models.TrainingRecord
	if err := h.db.Preload("User").Where("id = ?", id).First(&record).Error; err != nil {
		response.Error(c, http.StatusNotFound, "训练记录不存在")
		return
	}

	response.Success(c, record, "获取成功")
}

// 更新训练记录
func (h *AdminHandler) UpdateTrainingRecord(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Type      *string                 `json:"type"`
		Duration  *int                    `json:"duration"`
		Data      *map[string]interface{} `json:"data"`
		Timestamp *time.Time              `json:"timestamp"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	var record models.TrainingRecord
	if err := h.db.Where("id = ?", id).First(&record).Error; err != nil {
		response.Error(c, http.StatusNotFound, "训练记录不存在")
		return
	}

	if req.Type != nil {
		record.Type = *req.Type
	}
	if req.Duration != nil {
		record.Duration = *req.Duration
	}
	if req.Data != nil {
		record.Data = models.JSONB(*req.Data)
	}
	if req.Timestamp != nil {
		record.Timestamp = *req.Timestamp
	}

	if err := h.db.Save(&record).Error; err != nil {
		h.logOperation(c, "UpdateTrainingRecord", "TrainingRecord", record.ID.String(), "更新训练记录失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "更新失败: "+err.Error())
		return
	}

	h.logOperation(c, "UpdateTrainingRecord", "TrainingRecord", record.ID.String(), "训练记录更新成功", "Success")
	response.Success(c, record, "更新成功")
}

// 删除训练记录（支持批量删除）
func (h *AdminHandler) DeleteTrainingRecord(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供训练记录ID列表")
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.TrainingRecord{}).Error; err != nil {
		h.logOperation(c, "DeleteTrainingRecord", "TrainingRecord", strings.Join(req.IDs, ","), "删除训练记录失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	h.logOperation(c, "DeleteTrainingRecord", "TrainingRecord", strings.Join(req.IDs, ","), "删除训练记录成功", "Success")
	response.Success(c, nil, "删除成功")
}

// ========== 操作日志管理 ==========

// 获取操作日志列表
func (h *AdminHandler) GetOperationLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var logs []models.OperationLog
	var total int64

	query := h.db.Model(&models.OperationLog{})

	// 按操作类型筛选
	if action := c.Query("action"); action != "" {
		query = query.Where("action LIKE ?", "%"+action+"%")
	}

	// 按资源类型筛选
	if resource := c.Query("resource"); resource != "" {
		query = query.Where("resource = ?", resource)
	}

	// 按状态筛选
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// 按管理员筛选
	if username := c.Query("username"); username != "" {
		query = query.Where("username LIKE ?", "%"+username+"%")
	}

	// 按时间范围筛选
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&logs).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"logs":      logs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// 获取操作日志详情
func (h *AdminHandler) GetOperationLog(c *gin.Context) {
	id := c.Param("id")

	var log models.OperationLog
	if err := h.db.Where("id = ?", id).First(&log).Error; err != nil {
		response.Error(c, http.StatusNotFound, "操作日志不存在")
		return
	}

	response.Success(c, log, "获取成功")
}

// ========== 评论管理 ==========

// 获取评论列表
func (h *AdminHandler) GetComments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var comments []models.Comment
	var total int64

	query := h.db.Model(&models.Comment{}).Preload("User").Preload("Post")

	// 按帖子ID筛选
	if postID := c.Query("post_id"); postID != "" {
		query = query.Where("post_id = ?", postID)
	}

	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// 搜索评论内容
	if keyword := c.Query("keyword"); keyword != "" {
		query = query.Where("content LIKE ?", "%"+keyword+"%")
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&comments).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"comments":  comments,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// 获取评论详情
func (h *AdminHandler) GetComment(c *gin.Context) {
	id := c.Param("id")

	var comment models.Comment
	if err := h.db.Preload("User").Preload("Post").Where("id = ?", id).First(&comment).Error; err != nil {
		response.Error(c, http.StatusNotFound, "评论不存在")
		return
	}

	response.Success(c, comment, "获取成功")
}

// 更新评论
func (h *AdminHandler) UpdateComment(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Content *string `json:"content"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	var comment models.Comment
	if err := h.db.Where("id = ?", id).First(&comment).Error; err != nil {
		response.Error(c, http.StatusNotFound, "评论不存在")
		return
	}

	if req.Content != nil {
		comment.Content = *req.Content
	}

	if err := h.db.Save(&comment).Error; err != nil {
		h.logOperation(c, "UpdateComment", "Comment", comment.ID.String(), "更新评论失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "更新失败: "+err.Error())
		return
	}

	h.logOperation(c, "UpdateComment", "Comment", comment.ID.String(), "评论更新成功", "Success")
	response.Success(c, comment, "更新成功")
}

// 删除评论（支持批量删除）
func (h *AdminHandler) DeleteComment(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供评论ID列表")
		return
	}

	tx := h.db.Begin()
	if tx.Error != nil {
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	// 先删除相关的点赞记录
	if err := tx.Where("comment_id IN ?", req.IDs).Delete(&models.CommentLike{}).Error; err != nil {
		tx.Rollback()
		response.Error(c, http.StatusInternalServerError, "删除相关点赞失败")
		return
	}

	// 再删除评论
	if err := tx.Where("id IN ?", req.IDs).Delete(&models.Comment{}).Error; err != nil {
		tx.Rollback()
		h.logOperation(c, "DeleteComment", "Comment", strings.Join(req.IDs, ","), "删除评论失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除评论失败")
		return
	}

	tx.Commit()
	h.logOperation(c, "DeleteComment", "Comment", strings.Join(req.IDs, ","), "删除评论成功", "Success")
	response.Success(c, nil, "删除成功")
}

// ========== 关注/收藏关系管理 ==========

// 获取关注列表
func (h *AdminHandler) GetFollows(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var follows []models.Follow
	var total int64

	query := h.db.Model(&models.Follow{}).Preload("Follower").Preload("Followee")

	// 按关注者ID筛选
	if followerID := c.Query("follower_id"); followerID != "" {
		query = query.Where("follower_id = ?", followerID)
	}

	// 按被关注者ID筛选
	if followeeID := c.Query("followee_id"); followeeID != "" {
		query = query.Where("followee_id = ?", followeeID)
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&follows).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"follows":   follows,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// 删除关注关系（支持批量删除）
func (h *AdminHandler) DeleteFollow(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供关注关系ID列表")
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.Follow{}).Error; err != nil {
		h.logOperation(c, "DeleteFollow", "Follow", strings.Join(req.IDs, ","), "删除关注关系失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	h.logOperation(c, "DeleteFollow", "Follow", strings.Join(req.IDs, ","), "删除关注关系成功", "Success")
	response.Success(c, nil, "删除成功")
}

// 获取收藏列表
func (h *AdminHandler) GetPostCollections(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var collections []models.PostCollection
	var total int64

	query := h.db.Model(&models.PostCollection{}).Preload("User").Preload("Post")

	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// 按帖子ID筛选
	if postID := c.Query("post_id"); postID != "" {
		query = query.Where("post_id = ?", postID)
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&collections).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"collections": collections,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
	}, "获取成功")
}

// 删除收藏（支持批量删除）
func (h *AdminHandler) DeletePostCollection(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供收藏ID列表")
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.PostCollection{}).Error; err != nil {
		h.logOperation(c, "DeletePostCollection", "PostCollection", strings.Join(req.IDs, ","), "删除收藏失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	h.logOperation(c, "DeletePostCollection", "PostCollection", strings.Join(req.IDs, ","), "删除收藏成功", "Success")
	response.Success(c, nil, "删除成功")
}

// ========== 点赞管理 ==========

// 获取帖子点赞列表
func (h *AdminHandler) GetPostLikes(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var likes []models.PostLike
	var total int64

	query := h.db.Model(&models.PostLike{}).Preload("User").Preload("Post")

	// 按帖子ID筛选
	if postID := c.Query("post_id"); postID != "" {
		query = query.Where("post_id = ?", postID)
	}

	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&likes).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"likes":     likes,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// 删除帖子点赞（支持批量删除）
func (h *AdminHandler) DeletePostLike(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供点赞ID列表")
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.PostLike{}).Error; err != nil {
		h.logOperation(c, "DeletePostLike", "PostLike", strings.Join(req.IDs, ","), "删除点赞失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	h.logOperation(c, "DeletePostLike", "PostLike", strings.Join(req.IDs, ","), "删除点赞成功", "Success")
	response.Success(c, nil, "删除成功")
}

// ========== 增强的数据统计 ==========

// 获取详细的数据统计
func (h *AdminHandler) GetDetailedStats(c *gin.Context) {
	var stats struct {
		// 用户统计
		TotalUsers        int64 `json:"total_users"`
		ActiveUsers       int64 `json:"active_users"`       // 最近7天活跃用户
		NewUsersToday     int64 `json:"new_users_today"`    // 今日新增用户
		NewUsersThisWeek  int64 `json:"new_users_this_week"` // 本周新增用户
		NewUsersThisMonth int64 `json:"new_users_this_month"` // 本月新增用户

		// 训练统计
		TotalRecords      int64 `json:"total_records"`
		MeditationCount   int64 `json:"meditation_count"`
		AirflowCount      int64 `json:"airflow_count"`
		ExposureCount     int64 `json:"exposure_count"`
		PracticeCount     int64 `json:"practice_count"`
		TotalDuration     int64 `json:"total_duration"`     // 总训练时长（分钟）
		AvgDuration       int64 `json:"avg_duration"`       // 平均训练时长（分钟）

		// 社区统计
		TotalPosts        int64 `json:"total_posts"`
		TotalComments     int64 `json:"total_comments"`
		TotalLikes        int64 `json:"total_likes"`
		TotalCollections  int64 `json:"total_collections"`
		TotalFollows      int64 `json:"total_follows"`
		TotalRooms        int64 `json:"total_rooms"`
		ActiveRooms       int64 `json:"active_rooms"`

		// AI功能统计
		TotalAIConversations int64 `json:"total_ai_conversations"`

		// 内容统计
		TotalTongueTwisters int64 `json:"total_tongue_twisters"`
		TotalDailyExpressions int64 `json:"total_daily_expressions"`
	}

	// 用户统计
	h.db.Model(&models.User{}).Count(&stats.TotalUsers)
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	h.db.Model(&models.User{}).Where("created_at >= ?", sevenDaysAgo).Count(&stats.ActiveUsers)
	
	today := time.Now().Format("2006-01-02")
	h.db.Model(&models.User{}).Where("DATE(created_at) = ?", today).Count(&stats.NewUsersToday)
	
	weekStart := time.Now().AddDate(0, 0, -int(time.Now().Weekday()))
	h.db.Model(&models.User{}).Where("created_at >= ?", weekStart).Count(&stats.NewUsersThisWeek)
	
	monthStart := time.Now().AddDate(0, 0, -time.Now().Day())
	h.db.Model(&models.User{}).Where("created_at >= ?", monthStart).Count(&stats.NewUsersThisMonth)

	// 训练统计
	h.db.Model(&models.TrainingRecord{}).Count(&stats.TotalRecords)
	h.db.Model(&models.TrainingRecord{}).Where("type = ?", "meditation").Count(&stats.MeditationCount)
	h.db.Model(&models.TrainingRecord{}).Where("type = ?", "airflow").Count(&stats.AirflowCount)
	h.db.Model(&models.TrainingRecord{}).Where("type = ?", "exposure").Count(&stats.ExposureCount)
	h.db.Model(&models.TrainingRecord{}).Where("type = ?", "practice").Count(&stats.PracticeCount)
	
	var durationResult struct {
		Total int64
		Avg   float64
	}
	h.db.Model(&models.TrainingRecord{}).Select("COALESCE(SUM(duration), 0) as total, COALESCE(AVG(duration), 0) as avg").Scan(&durationResult)
	stats.TotalDuration = durationResult.Total / 60 // 转换为分钟
	stats.AvgDuration = int64(durationResult.Avg / 60)

	// 社区统计
	h.db.Model(&models.Post{}).Count(&stats.TotalPosts)
	h.db.Model(&models.Comment{}).Count(&stats.TotalComments)
	h.db.Model(&models.PostLike{}).Count(&stats.TotalLikes)
	h.db.Model(&models.PostCollection{}).Count(&stats.TotalCollections)
	h.db.Model(&models.Follow{}).Count(&stats.TotalFollows)
	h.db.Model(&models.PracticeRoom{}).Count(&stats.TotalRooms)
	h.db.Model(&models.PracticeRoom{}).Where("is_active = ?", true).Count(&stats.ActiveRooms)

	// AI功能统计
	h.db.Model(&models.AIConversation{}).Count(&stats.TotalAIConversations)

	// 内容统计
	h.db.Model(&models.TongueTwister{}).Count(&stats.TotalTongueTwisters)
	h.db.Model(&models.DailyExpression{}).Count(&stats.TotalDailyExpressions)

	response.Success(c, stats, "获取成功")
}

// ========== 绕口令管理 ==========

// 获取绕口令列表
func (h *AdminHandler) GetTongueTwisters(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var tongueTwisters []models.TongueTwister
	var total int64

	query := h.db.Model(&models.TongueTwister{})
	
	// 搜索
	if keyword := c.Query("keyword"); keyword != "" {
		query = query.Where("title LIKE ? OR content LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 按难度筛选
	if level := c.Query("level"); level != "" {
		query = query.Where("level = ?", level)
	}

	// 按状态筛选
	if isActive := c.Query("is_active"); isActive != "" {
		active := isActive == "true"
		query = query.Where("is_active = ?", active)
	}

	query.Count(&total)
	
	if err := query.Offset(offset).Limit(pageSize).Order("level ASC, \"order\" ASC, created_at DESC").Find(&tongueTwisters).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"tongue_twisters": tongueTwisters,
		"total":           total,
		"page":            page,
		"page_size":       pageSize,
	}, "获取成功")
}

// 获取绕口令详情
func (h *AdminHandler) GetTongueTwister(c *gin.Context) {
	id := c.Param("id")
	
	var tongueTwister models.TongueTwister
	if err := h.db.Where("id = ?", id).First(&tongueTwister).Error; err != nil {
		response.Error(c, http.StatusNotFound, "绕口令不存在")
		return
	}

	response.Success(c, tongueTwister, "获取成功")
}

// 创建绕口令
func (h *AdminHandler) CreateTongueTwister(c *gin.Context) {
	var req models.TongueTwister
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := h.db.Create(&req).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建失败")
		return
	}

	response.Success(c, req, "创建成功")
}

// 批量创建绕口令
func (h *AdminHandler) BatchCreateTongueTwisters(c *gin.Context) {
	var req []models.TongueTwister
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if len(req) == 0 {
		response.Error(c, http.StatusBadRequest, "请求体不能为空")
		return
	}

	tx := h.db.Begin()
	if tx.Error != nil {
		response.Error(c, http.StatusInternalServerError, "创建失败")
		return
	}

	for _, twister := range req {
		if err := tx.Create(&twister).Error; err != nil {
			tx.Rollback()
			response.Error(c, http.StatusInternalServerError, "批量创建失败: "+err.Error())
			return
		}
	}

	tx.Commit()
	response.Success(c, nil, "批量创建成功")
}

// 更新绕口令
func (h *AdminHandler) UpdateTongueTwister(c *gin.Context) {
	id := c.Param("id")
	
	var tongueTwister models.TongueTwister
	if err := h.db.Where("id = ?", id).First(&tongueTwister).Error; err != nil {
		response.Error(c, http.StatusNotFound, "绕口令不存在")
		return
	}

	var req models.TongueTwister
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 更新字段
	tongueTwister.Title = req.Title
	tongueTwister.Content = req.Content
	tongueTwister.Tips = req.Tips
	tongueTwister.Level = req.Level
	tongueTwister.Order = req.Order
	tongueTwister.IsActive = req.IsActive

	if err := h.db.Save(&tongueTwister).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新失败")
		return
	}

	response.Success(c, tongueTwister, "更新成功")
}

// 删除绕口令（支持批量删除）
func (h *AdminHandler) DeleteTongueTwister(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供绕口令ID列表")
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.TongueTwister{}).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	response.Success(c, nil, "删除成功")
}

// 清理绕口令（删除空白和重复的）
func (h *AdminHandler) CleanTongueTwisters(c *gin.Context) {
	tx := h.db.Begin()
	if tx.Error != nil {
		response.Error(c, http.StatusInternalServerError, "清理失败")
		return
	}

	// 1. 删除空白绕口令
	// 标题为空或只包含空格，或者内容为空或只包含空格
	deleteBlankResult := tx.Where("TRIM(title) = '' OR TRIM(content) = ''").Delete(&models.TongueTwister{})
	if deleteBlankResult.Error != nil {
		tx.Rollback()
		response.Error(c, http.StatusInternalServerError, "删除空白绕口令失败: "+deleteBlankResult.Error.Error())
		return
	}

	// 2. 删除重复绕口令
	// 查找所有重复的 content，并保留每个组合中 ID 最小的一个
	var duplicateTwisters []models.TongueTwister
	// 使用子查询找到每个重复组中最小的 ID
	err := tx.Raw(`
		DELETE FROM tongue_twisters
		WHERE id IN (
			SELECT id FROM (
				SELECT
					id,
					ROW_NUMBER() OVER(PARTITION BY content ORDER BY created_at) as rn
				FROM
					tongue_twisters
			) AS sub
			WHERE sub.rn > 1
		) RETURNING *;
	`).Scan(&duplicateTwisters).Error

	if err != nil {
		tx.Rollback()
		response.Error(c, http.StatusInternalServerError, "删除重复绕口令失败: "+err.Error())
		return
	}

	tx.Commit()
	response.Success(c, gin.H{
		"deleted_blank_count": deleteBlankResult.RowsAffected,
		"deleted_duplicate_count": len(duplicateTwisters),
	}, "绕口令清理成功")
}

// ========== 每日朗诵文案管理 ==========

// 获取每日朗诵文案列表
func (h *AdminHandler) GetDailyExpressions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var expressions []models.DailyExpression
	var total int64

	query := h.db.Model(&models.DailyExpression{})
	
	// 搜索
	if keyword := c.Query("keyword"); keyword != "" {
		query = query.Where("title LIKE ? OR content LIKE ? OR source LIKE ?", 
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	// 按状态筛选
	if isActive := c.Query("is_active"); isActive != "" {
		active := isActive == "true"
		query = query.Where("is_active = ?", active)
	}

	query.Count(&total)
	
	if err := query.Offset(offset).Limit(pageSize).Order("date DESC, created_at DESC").Find(&expressions).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	response.Success(c, gin.H{
		"expressions": expressions,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
	}, "获取成功")
}

// 获取每日朗诵文案详情
func (h *AdminHandler) GetDailyExpression(c *gin.Context) {
	id := c.Param("id")
	
	var expression models.DailyExpression
	if err := h.db.Where("id = ?", id).First(&expression).Error; err != nil {
		response.Error(c, http.StatusNotFound, "文案不存在")
		return
	}

	response.Success(c, expression, "获取成功")
}

// 创建每日朗诵文案
func (h *AdminHandler) CreateDailyExpression(c *gin.Context) {
	var req models.DailyExpression
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	if err := h.db.Create(&req).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建失败")
		return
	}

	response.Success(c, req, "创建成功")
}

// 更新每日朗诵文案
func (h *AdminHandler) UpdateDailyExpression(c *gin.Context) {
	id := c.Param("id")
	
	var expression models.DailyExpression
	if err := h.db.Where("id = ?", id).First(&expression).Error; err != nil {
		response.Error(c, http.StatusNotFound, "文案不存在")
		return
	}

	var req models.DailyExpression
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	// 更新字段
	expression.Title = req.Title
	expression.Content = req.Content
	expression.Tips = req.Tips
	expression.Source = req.Source
	expression.Date = req.Date
	expression.IsActive = req.IsActive

	if err := h.db.Save(&expression).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新失败")
		return
	}

	response.Success(c, expression, "更新成功")
}

// 删除每日朗诵文案（支持批量删除）
func (h *AdminHandler) DeleteDailyExpression(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误，需要提供文案ID列表")
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.DailyExpression{}).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	response.Success(c, nil, "删除成功")
}

// 批量创建每日朗诵文案
func (h *AdminHandler) BatchCreateDailyExpressions(c *gin.Context) {
	var req []models.DailyExpression
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if len(req) == 0 {
		response.Error(c, http.StatusBadRequest, "请求体不能为空")
		return
	}

	tx := h.db.Begin()
	if tx.Error != nil {
		response.Error(c, http.StatusInternalServerError, "创建失败")
		return
	}

	for _, expression := range req {
		if err := tx.Create(&expression).Error; err != nil {
			tx.Rollback()
			response.Error(c, http.StatusInternalServerError, "批量创建失败: "+err.Error())
			return
		}
	}

	tx.Commit()
	response.Success(c, nil, "批量创建成功")
}

// ========== 语音技巧训练管理 ==========

// GetSpeechTechniques 获取语音技巧列表
func (h *AdminHandler) GetSpeechTechniques(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize

	var techniques []models.SpeechTechnique
	query := h.db.Model(&models.SpeechTechnique{})

	var total int64
	query.Count(&total)

	if err := query.Offset(offset).Limit(pageSize).Order("\"order\" ASC, created_at DESC").Find(&techniques).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "获取失败")
		return
	}

	response.Success(c, gin.H{
		"techniques": techniques,
		"total":      total,
		"page":       page,
		"page_size":  pageSize,
	}, "获取成功")
}

// GetSpeechTechnique 获取单个语音技巧
func (h *AdminHandler) GetSpeechTechnique(c *gin.Context) {
	id := c.Param("id")
	
	var technique models.SpeechTechnique
	if err := h.db.Where("id = ?", id).First(&technique).Error; err != nil {
		response.Error(c, http.StatusNotFound, "语音技巧不存在")
		return
	}

	response.Success(c, technique, "获取成功")
}

// CreateSpeechTechnique 创建语音技巧
func (h *AdminHandler) CreateSpeechTechnique(c *gin.Context) {
	var req models.SpeechTechnique
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := h.db.Create(&req).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建失败")
		return
	}

	response.Success(c, req, "创建成功")
}

// UpdateSpeechTechnique 更新语音技巧
func (h *AdminHandler) UpdateSpeechTechnique(c *gin.Context) {
	id := c.Param("id")
	
	var technique models.SpeechTechnique
	if err := h.db.Where("id = ?", id).First(&technique).Error; err != nil {
		response.Error(c, http.StatusNotFound, "语音技巧不存在")
		return
	}

	var req models.SpeechTechnique
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	technique.Name = req.Name
	technique.Icon = req.Icon
	technique.Description = req.Description
	technique.Tips = req.Tips
	technique.PracticeTexts = req.PracticeTexts
	technique.Order = req.Order
	technique.IsActive = req.IsActive

	if err := h.db.Save(&technique).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新失败")
		return
	}

	response.Success(c, technique, "更新成功")
}

// DeleteSpeechTechnique 删除语音技巧
func (h *AdminHandler) DeleteSpeechTechnique(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := h.db.Where("id IN ?", req.IDs).Delete(&models.SpeechTechnique{}).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	response.Success(c, nil, "删除成功")
}

// BatchCreateSpeechTechniques 批量创建语音技巧
func (h *AdminHandler) BatchCreateSpeechTechniques(c *gin.Context) {
	var req []models.SpeechTechnique
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if len(req) == 0 {
		response.Error(c, http.StatusBadRequest, "请求体不能为空")
		return
	}

	tx := h.db.Begin()
	if tx.Error != nil {
		response.Error(c, http.StatusInternalServerError, "创建失败")
		return
	}

	for _, technique := range req {
		if err := tx.Create(&technique).Error; err != nil {
			tx.Rollback()
			response.Error(c, http.StatusInternalServerError, "批量创建失败: "+err.Error())
			return
		}
	}

	tx.Commit()
	response.Success(c, nil, "批量创建成功")
}

// TestRoute 用于测试路由是否正常工作
func (h *AdminHandler) TestRoute(c *gin.Context) {
	response.Success(c, nil, "Test route works!")
}

// ========== 用户设置管理 ==========

// GetUserSettings 获取用户设置
func (h *AdminHandler) GetUserSettings(c *gin.Context) {
	userID := c.Param("user_id")
	
	var settings models.UserSettings
	if err := h.db.Where("user_id = ?", userID).First(&settings).Error; err != nil {
		// 如果用户设置不存在，返回默认设置
		settings = models.UserSettings{
			UserID:                  uuid.MustParse(userID),
			EnablePushNotifications:  true,
			EnableEmailNotifications: true,
			NotificationSound:        true,
			PublicProfile:            false,
			ShowTrainingStats:        true,
			AllowFriendRequests:      true,
			DataCollectionConsent:    true,
			AIVoiceType:              "zh_female_wanqudashu_moon_bigtts",
			AISpeakingSpeed:          50,
			AIPersonality:            "friendly",
			DifficultyLevel:          "beginner",
			DailyGoalMinutes:         15,
			Theme:                    "light",
			FontSize:                 "medium",
			Language:                 "zh-CN",
		}
	}
	
	response.Success(c, settings, "获取成功")
}

// UpdateUserSettings 更新用户设置
func (h *AdminHandler) UpdateUserSettings(c *gin.Context) {
	userID := c.Param("user_id")
	
	var req struct {
		EnablePushNotifications  *bool   `json:"enable_push_notifications,omitempty"`
		EnableEmailNotifications *bool   `json:"enable_email_notifications,omitempty"`
		NotificationSound        *bool   `json:"notification_sound,omitempty"`
		PublicProfile            *bool   `json:"public_profile,omitempty"`
		ShowTrainingStats        *bool   `json:"show_training_stats,omitempty"`
		AllowFriendRequests      *bool   `json:"allow_friend_requests,omitempty"`
		DataCollectionConsent    *bool   `json:"data_collection_consent,omitempty"`
		AIVoiceType              *string `json:"ai_voice_type,omitempty"`
		AISpeakingSpeed          *int    `json:"ai_speaking_speed,omitempty"`
		AIPersonality            *string `json:"ai_personality,omitempty"`
		DifficultyLevel          *string `json:"difficulty_level,omitempty"`
		DailyGoalMinutes         *int    `json:"daily_goal_minutes,omitempty"`
		PreferredPracticeTime    *string `json:"preferred_practice_time,omitempty"`
		Theme                    *string `json:"theme,omitempty"`
		FontSize                 *string `json:"font_size,omitempty"`
		Language                 *string `json:"language,omitempty"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	
	var settings models.UserSettings
	result := h.db.Where("user_id = ?", userID).First(&settings)
	
	if result.Error != nil {
		// 用户设置不存在，创建新的
		settings = models.UserSettings{
			UserID:                  uuid.MustParse(userID),
			EnablePushNotifications:  true,
			EnableEmailNotifications: true,
			NotificationSound:        true,
			PublicProfile:            false,
			ShowTrainingStats:        true,
			AllowFriendRequests:      true,
			DataCollectionConsent:    true,
			AIVoiceType:              "zh_female_wanqudashu_moon_bigtts",
			AISpeakingSpeed:          50,
			AIPersonality:            "friendly",
			DifficultyLevel:          "beginner",
			DailyGoalMinutes:         15,
			Theme:                    "light",
			FontSize:                 "medium",
			Language:                 "zh-CN",
		}
	}
	
	// 更新字段
	if req.EnablePushNotifications != nil {
		settings.EnablePushNotifications = *req.EnablePushNotifications
	}
	if req.EnableEmailNotifications != nil {
		settings.EnableEmailNotifications = *req.EnableEmailNotifications
	}
	if req.NotificationSound != nil {
		settings.NotificationSound = *req.NotificationSound
	}
	if req.PublicProfile != nil {
		settings.PublicProfile = *req.PublicProfile
	}
	if req.ShowTrainingStats != nil {
		settings.ShowTrainingStats = *req.ShowTrainingStats
	}
	if req.AllowFriendRequests != nil {
		settings.AllowFriendRequests = *req.AllowFriendRequests
	}
	if req.DataCollectionConsent != nil {
		settings.DataCollectionConsent = *req.DataCollectionConsent
	}
	if req.AIVoiceType != nil {
		settings.AIVoiceType = *req.AIVoiceType
	}
	if req.AISpeakingSpeed != nil {
		settings.AISpeakingSpeed = *req.AISpeakingSpeed
	}
	if req.AIPersonality != nil {
		settings.AIPersonality = *req.AIPersonality
	}
	if req.DifficultyLevel != nil {
		settings.DifficultyLevel = *req.DifficultyLevel
	}
	if req.DailyGoalMinutes != nil {
		settings.DailyGoalMinutes = *req.DailyGoalMinutes
	}
	if req.PreferredPracticeTime != nil {
		settings.PreferredPracticeTime = *req.PreferredPracticeTime
	}
	if req.Theme != nil {
		settings.Theme = *req.Theme
	}
	if req.FontSize != nil {
		settings.FontSize = *req.FontSize
	}
	if req.Language != nil {
		settings.Language = *req.Language
	}
	
	if result.Error != nil {
		// 创建新记录
		if err := h.db.Create(&settings).Error; err != nil {
			response.Error(c, http.StatusInternalServerError, "创建用户设置失败")
			return
		}
	} else {
		// 更新现有记录
		if err := h.db.Save(&settings).Error; err != nil {
			response.Error(c, http.StatusInternalServerError, "更新用户设置失败")
			return
		}
	}
	
	h.logOperation(c, "UpdateUserSettings", "UserSettings", userID, "用户设置更新成功", "Success")
	response.Success(c, settings, "更新成功")
}

// GetAllUserSettings 获取所有用户设置（分页）
func (h *AdminHandler) GetAllUserSettings(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize
	
	var settings []models.UserSettings
	var total int64
	
	query := h.db.Model(&models.UserSettings{})
	
	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	
	// 按主题筛选
	if theme := c.Query("theme"); theme != "" {
		query = query.Where("theme = ?", theme)
	}
	
	// 按难度筛选
	if difficulty := c.Query("difficulty_level"); difficulty != "" {
		query = query.Where("difficulty_level = ?", difficulty)
	}
	
	query.Count(&total)
	
	if err := query.Offset(offset).Limit(pageSize).Order("updated_at DESC").Find(&settings).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}
	
	response.Success(c, gin.H{
		"settings":  settings,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// ResetUserSettings 重置用户设置为默认值
func (h *AdminHandler) ResetUserSettings(c *gin.Context) {
	userID := c.Param("user_id")
	
	settings := models.UserSettings{
		UserID:                  uuid.MustParse(userID),
		EnablePushNotifications:  true,
		EnableEmailNotifications: true,
		NotificationSound:        true,
		PublicProfile:            false,
		ShowTrainingStats:        true,
		AllowFriendRequests:      true,
		DataCollectionConsent:    true,
		AIVoiceType:              "zh_female_wanqudashu_moon_bigtts",
		AISpeakingSpeed:          50,
		AIPersonality:            "friendly",
		DifficultyLevel:          "beginner",
		DailyGoalMinutes:         15,
		Theme:                    "light",
		FontSize:                 "medium",
		Language:                 "zh-CN",
	}
	
	// 先删除现有设置
	h.db.Where("user_id = ?", userID).Delete(&models.UserSettings{})
	
	// 创建默认设置
	if err := h.db.Create(&settings).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "重置用户设置失败")
		return
	}
	
	h.logOperation(c, "ResetUserSettings", "UserSettings", userID, "用户设置重置成功", "Success")
	response.Success(c, settings, "重置成功")
}

// ========== 用户反馈管理 ==========

// GetFeedbackList 获取反馈列表
func (h *AdminHandler) GetFeedbackList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	offset := (page - 1) * pageSize
	
	var feedbacks []models.Feedback
	var total int64
	
	query := h.db.Model(&models.Feedback{}).Preload("User")
	
	// 按类型筛选
	if feedbackType := c.Query("type"); feedbackType != "" {
		query = query.Where("type = ?", feedbackType)
	}
	
	// 按状态筛选
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	
	// 按用户ID筛选
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	
	query.Count(&total)
	
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&feedbacks).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}
	
	response.Success(c, gin.H{
		"feedbacks": feedbacks,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// GetFeedback 获取反馈详情
func (h *AdminHandler) GetFeedback(c *gin.Context) {
	id := c.Param("id")
	
	var feedback models.Feedback
	if err := h.db.Preload("User").Where("id = ?", id).First(&feedback).Error; err != nil {
		response.Error(c, http.StatusNotFound, "反馈不存在")
		return
	}
	
	response.Success(c, feedback, "获取成功")
}

// UpdateFeedbackStatus 更新反馈状态
func (h *AdminHandler) UpdateFeedbackStatus(c *gin.Context) {
	id := c.Param("id")
	
	var req struct {
		Status   string  `json:"status" binding:"required,oneof=pending processing resolved"`
		Response *string `json:"response,omitempty"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	
	var feedback models.Feedback
	if err := h.db.Where("id = ?", id).First(&feedback).Error; err != nil {
		response.Error(c, http.StatusNotFound, "反馈不存在")
		return
	}
	
	feedback.Status = req.Status
	if req.Response != nil {
		feedback.Response = req.Response
	}
	
	if err := h.db.Save(&feedback).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新失败")
		return
	}
	
	h.logOperation(c, "UpdateFeedbackStatus", "Feedback", feedback.ID.String(), "反馈状态更新成功", "Success")
	response.Success(c, feedback, "更新成功")
}

// DeleteFeedback 删除反馈
func (h *AdminHandler) DeleteFeedback(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.db.Where("id = ?", id).Delete(&models.Feedback{}).Error; err != nil {
		h.logOperation(c, "DeleteFeedback", "Feedback", id, "删除反馈失败: "+err.Error(), "Failure")
		response.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}
	
	h.logOperation(c, "DeleteFeedback", "Feedback", id, "删除反馈成功", "Success")
	response.Success(c, nil, "删除成功")
}

// GetFeedbackStats 获取反馈统计
func (h *AdminHandler) GetFeedbackStats(c *gin.Context) {
	var stats struct {
		TotalCount      int64 `json:"total_count"`
		PendingCount    int64 `json:"pending_count"`
		ProcessingCount int64 `json:"processing_count"`
		ResolvedCount   int64 `json:"resolved_count"`
		BugCount        int64 `json:"bug_count"`
		FeedbackCount   int64 `json:"feedback_count"`
		SuggestionCount int64 `json:"suggestion_count"`
	}
	
	h.db.Model(&models.Feedback{}).Count(&stats.TotalCount)
	h.db.Model(&models.Feedback{}).Where("status = ?", "pending").Count(&stats.PendingCount)
	h.db.Model(&models.Feedback{}).Where("status = ?", "processing").Count(&stats.ProcessingCount)
	h.db.Model(&models.Feedback{}).Where("status = ?", "resolved").Count(&stats.ResolvedCount)
	h.db.Model(&models.Feedback{}).Where("type = ?", "bug").Count(&stats.BugCount)
	h.db.Model(&models.Feedback{}).Where("type = ?", "feedback").Count(&stats.FeedbackCount)
	h.db.Model(&models.Feedback{}).Where("type = ?", "suggestion").Count(&stats.SuggestionCount)
	
	response.Success(c, stats, "获取成功")
}

// GetLegalDocuments 获取所有法律文档列表
func (h *AdminHandler) GetLegalDocuments(c *gin.Context) {
	var documents []models.LegalDocument
	if err := h.db.Order("type ASC, updated_at DESC").Find(&documents).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "获取法律文档列表失败")
		return
	}

	response.Success(c, gin.H{
		"documents": documents,
		"total":     len(documents),
	}, "获取成功")
}

// GetLegalDocument 获取单个法律文档
func (h *AdminHandler) GetLegalDocument(c *gin.Context) {
	id := c.Param("id")

	var doc models.LegalDocument
	if err := h.db.Where("id = ?", id).First(&doc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "法律文档不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取法律文档失败")
		return
	}

	response.Success(c, doc, "获取成功")
}

// CreateLegalDocument 创建法律文档
func (h *AdminHandler) CreateLegalDocument(c *gin.Context) {
	var req struct {
		Type     string `json:"type" binding:"required"`
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		Version  string `json:"version" binding:"required"`
		IsActive bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	// 验证类型
	if req.Type != "terms_of_service" && req.Type != "privacy_policy" {
		response.Error(c, http.StatusBadRequest, "无效的文档类型")
		return
	}

	// 检查该类型是否已存在
	var existingDoc models.LegalDocument
	if err := h.db.Where("type = ? AND is_active = ?", req.Type, true).First(&existingDoc).Error; err == nil {
		// 如果已存在启用的文档，将旧的设为禁用
		existingDoc.IsActive = false
		h.db.Save(&existingDoc)
	}

	// 创建新文档
	doc := models.LegalDocument{
		Type:     req.Type,
		Title:    req.Title,
		Content:  req.Content,
		Version:  req.Version,
		IsActive: req.IsActive,
	}

	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if exists {
		uid := userID.(uuid.UUID)
		doc.UpdatedBy = &uid
	}

	if err := h.db.Create(&doc).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "创建法律文档失败")
		return
	}

	h.logOperation(c, "create", "legal_document", doc.ID.String(), "创建法律文档: "+doc.Title, "success")
	response.Success(c, doc, "创建成功")
}

// UpdateLegalDocument 更新法律文档
func (h *AdminHandler) UpdateLegalDocument(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Type     *string `json:"type"`
		Title    *string `json:"title"`
		Content  *string `json:"content"`
		Version  *string `json:"version"`
		IsActive *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	var doc models.LegalDocument
	if err := h.db.Where("id = ?", id).First(&doc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "法律文档不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取法律文档失败")
		return
	}

	// 更新字段
	if req.Type != nil {
		if *req.Type != "terms_of_service" && *req.Type != "privacy_policy" {
			response.Error(c, http.StatusBadRequest, "无效的文档类型")
			return
		}
		doc.Type = *req.Type
	}
	if req.Title != nil {
		doc.Title = *req.Title
	}
	if req.Content != nil {
		doc.Content = *req.Content
	}
	if req.Version != nil {
		doc.Version = *req.Version
	}
	if req.IsActive != nil {
		// 如果启用新文档，禁用同类型的其他文档
		if *req.IsActive && !doc.IsActive {
			h.db.Model(&models.LegalDocument{}).
				Where("type = ? AND id != ?", doc.Type, id).
				Update("is_active", false)
		}
		doc.IsActive = *req.IsActive
	}

	// 更新更新人
	userID, exists := c.Get("userID")
	if exists {
		uid := userID.(uuid.UUID)
		doc.UpdatedBy = &uid
	}

	if err := h.db.Save(&doc).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "更新法律文档失败")
		return
	}

	h.logOperation(c, "update", "legal_document", doc.ID.String(), "更新法律文档: "+doc.Title, "success")
	response.Success(c, doc, "更新成功")
}

// DeleteLegalDocument 删除法律文档
func (h *AdminHandler) DeleteLegalDocument(c *gin.Context) {
	id := c.Param("id")

	var doc models.LegalDocument
	if err := h.db.Where("id = ?", id).First(&doc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.Error(c, http.StatusNotFound, "法律文档不存在")
			return
		}
		response.Error(c, http.StatusInternalServerError, "获取法律文档失败")
		return
	}

	if err := h.db.Delete(&doc).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "删除法律文档失败")
		return
	}

	h.logOperation(c, "delete", "legal_document", doc.ID.String(), "删除法律文档: "+doc.Title, "success")
	response.Success(c, nil, "删除成功")
}