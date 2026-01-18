package main

import (
	"fmt"
	"log"

	"fluent-life-admin-api/internal/config"
	"fluent-life-admin-api/internal/models"

	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	// 初始化角色数据
	fmt.Println("初始化角色数据...")
	initRoles(db)

	// 初始化菜单数据
	fmt.Println("初始化菜单数据...")
	initMenus(db)

	fmt.Println("✅ 权限数据初始化完成！")
}

func initRoles(db *gorm.DB) {
	roles := []models.Role{
		{
			Name:        "超级管理员",
			Code:        "super_admin",
			Description: "拥有系统所有权限，可管理所有功能模块",
			Permissions: models.JSONB{
				"*": true, // 全部权限
			},
		},
		{
			Name:        "管理员",
			Code:        "admin",
			Description: "拥有大部分管理权限，可管理用户、内容等",
			Permissions: models.JSONB{
				"user:read":   true,
				"user:write":  true,
				"post:read":   true,
				"post:write":  true,
				"comment:read": true,
				"comment:write": true,
				"content:read": true,
				"content:write": true,
			},
		},
		{
			Name:        "内容管理员",
			Code:        "content_admin",
			Description: "负责内容管理，可管理帖子、评论、训练记录等",
			Permissions: models.JSONB{
				"post:read":      true,
				"post:write":     true,
				"comment:read":   true,
				"comment:write":  true,
				"training:read":  true,
				"training:write": true,
				"content:read":   true,
				"content:write":  true,
			},
		},
		{
			Name:        "普通用户",
			Code:        "user",
			Description: "普通用户角色，只能查看自己的数据",
			Permissions: models.JSONB{
				"self:read": true,
			},
		},
	}

	for _, role := range roles {
		var existingRole models.Role
		if err := db.Where("code = ?", role.Code).First(&existingRole).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&role).Error; err != nil {
					log.Printf("创建角色失败 %s: %v", role.Code, err)
				} else {
					fmt.Printf("  ✓ 创建角色: %s (%s)\n", role.Name, role.Code)
				}
			} else {
				log.Printf("查询角色失败 %s: %v", role.Code, err)
			}
		} else {
			fmt.Printf("  - 角色已存在: %s (%s)\n", existingRole.Name, existingRole.Code)
		}
	}
}

func initMenus(db *gorm.DB) {
	// 首先获取所有菜单，建立父子关系
	menusData := []struct {
		Name     string
		Path     string
		Icon     string
		ParentID *string
		Sort     int
	}{
		// 一级菜单
		{Name: "数据概览", Path: "/", Icon: "LayoutDashboard", ParentID: nil, Sort: 1},
		{Name: "用户管理", Path: "/users", Icon: "Users", ParentID: nil, Sort: 2},
		{Name: "视频管理", Path: "/videos", Icon: "FileText", ParentID: nil, Sort: 3},

		// 社区管理（分组）
		{Name: "社区管理", Path: "", Icon: "CommunityGroup", ParentID: nil, Sort: 4},
		{Name: "帖子管理", Path: "/posts", Icon: "FileText", ParentID: stringPtr("社区管理"), Sort: 1},
		{Name: "评论管理", Path: "/comments", Icon: "MessageCircle", ParentID: stringPtr("社区管理"), Sort: 2},
		{Name: "点赞管理", Path: "/post-likes", Icon: "ThumbsUp", ParentID: stringPtr("社区管理"), Sort: 3},
		{Name: "关注/收藏", Path: "/follows-collections", Icon: "UserPlus", ParentID: stringPtr("社区管理"), Sort: 4},

		// 训练管理（分组）
		{Name: "训练管理", Path: "", Icon: "TrainingGroup", ParentID: nil, Sort: 5},
		{Name: "训练统计", Path: "/training", Icon: "BarChart3", ParentID: stringPtr("训练管理"), Sort: 1},
		{Name: "房间管理", Path: "/rooms", Icon: "Home", ParentID: stringPtr("训练管理"), Sort: 2},

		// 脱敏练习（分组）
		{Name: "脱敏练习", Path: "", Icon: "Users", ParentID: nil, Sort: 6},
		{Name: "脱敏练习场景管理", Path: "/exposure-modules", Icon: "FileText", ParentID: stringPtr("脱敏练习"), Sort: 1},

		// 内容管理（分组）
		{Name: "内容管理", Path: "", Icon: "ContentGroup", ParentID: nil, Sort: 7},
		{Name: "绕口令管理", Path: "/tongue-twisters", Icon: "MessageSquare", ParentID: stringPtr("内容管理"), Sort: 1},
		{Name: "每日朗诵文案", Path: "/daily-expressions", Icon: "BookOpen", ParentID: stringPtr("内容管理"), Sort: 2},
		{Name: "语音技巧训练", Path: "/speech-techniques", Icon: "MessageSquare", ParentID: stringPtr("内容管理"), Sort: 3},
		{Name: "法律文档", Path: "/legal-documents", Icon: "FileText", ParentID: stringPtr("内容管理"), Sort: 4},
		{Name: "应用设置", Path: "/app-settings", Icon: "Settings", ParentID: stringPtr("内容管理"), Sort: 5},
		{Name: "帮助分类", Path: "/help-categories", Icon: "FileSearch", ParentID: stringPtr("内容管理"), Sort: 6},
		{Name: "帮助文章", Path: "/help-articles", Icon: "MessageSquare", ParentID: stringPtr("内容管理"), Sort: 7},

		// AI管理（分组）
		{Name: "AI管理", Path: "", Icon: "MessageSquare", ParentID: nil, Sort: 8},
		{Name: "AI模拟角色管理", Path: "/ai-roles", Icon: "Users", ParentID: stringPtr("AI管理"), Sort: 1},
		{Name: "音色管理", Path: "/voice-types", Icon: "Settings", ParentID: stringPtr("AI管理"), Sort: 2},

		// 系统管理（分组）
		{Name: "系统管理", Path: "", Icon: "SystemGroup", ParentID: nil, Sort: 9},
		{Name: "操作日志", Path: "/operation-logs", Icon: "FileSearch", ParentID: stringPtr("系统管理"), Sort: 1},
		{Name: "权限管理", Path: "/permission", Icon: "Shield", ParentID: stringPtr("系统管理"), Sort: 2},
		{Name: "系统设置", Path: "/settings", Icon: "Settings", ParentID: stringPtr("系统管理"), Sort: 3},
	}

	// 创建菜单映射，用于查找父菜单ID
	menuMap := make(map[string]*models.Menu)

	// 先创建一级菜单
	for _, menuData := range menusData {
		if menuData.ParentID == nil {
			var existingMenu models.Menu
			if err := db.Where("name = ? AND parent_id IS NULL", menuData.Name).First(&existingMenu).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					menu := models.Menu{
						Name:     menuData.Name,
						Path:     menuData.Path,
						Icon:     menuData.Icon,
						ParentID: nil,
						Sort:     menuData.Sort,
					}
					if err := db.Create(&menu).Error; err != nil {
						log.Printf("创建菜单失败 %s: %v", menuData.Name, err)
					} else {
						menuMap[menuData.Name] = &menu
						fmt.Printf("  ✓ 创建菜单: %s\n", menuData.Name)
					}
				} else {
					log.Printf("查询菜单失败 %s: %v", menuData.Name, err)
				}
			} else {
				menuMap[menuData.Name] = &existingMenu
				fmt.Printf("  - 菜单已存在: %s\n", existingMenu.Name)
			}
		}
	}

	// 再创建子菜单
	for _, menuData := range menusData {
		if menuData.ParentID != nil {
			parentMenu, exists := menuMap[*menuData.ParentID]
			if !exists {
				log.Printf("父菜单不存在: %s", *menuData.ParentID)
				continue
			}

			var existingMenu models.Menu
			if err := db.Where("name = ? AND parent_id = ?", menuData.Name, parentMenu.ID).First(&existingMenu).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					parentID := parentMenu.ID
					menu := models.Menu{
						Name:     menuData.Name,
						Path:     menuData.Path,
						Icon:     menuData.Icon,
						ParentID: &parentID,
						Sort:     menuData.Sort,
					}
					if err := db.Create(&menu).Error; err != nil {
						log.Printf("创建子菜单失败 %s: %v", menuData.Name, err)
					} else {
						fmt.Printf("  ✓ 创建子菜单: %s -> %s\n", *menuData.ParentID, menuData.Name)
					}
				} else {
					log.Printf("查询子菜单失败 %s: %v", menuData.Name, err)
				}
			} else {
				fmt.Printf("  - 子菜单已存在: %s -> %s\n", *menuData.ParentID, existingMenu.Name)
			}
		}
	}
}

func stringPtr(s string) *string {
	return &s
}
