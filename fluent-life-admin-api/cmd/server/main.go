package main

import (
	"log"

	"fluent-life-admin-api/internal/config"
	"fluent-life-admin-api/internal/handlers"
	"fluent-life-admin-api/internal/middleware"
	"fluent-life-admin-api/internal/models"
	"fluent-life-admin-api/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"     // Import uuid
	"golang.org/x/crypto/bcrypt" // Import bcrypt
	"gorm.io/gorm"               // Import gorm
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

	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Check and create default admin user if not exists
	var adminUser models.User
	if err := db.Where("username = ?", "admin").First(&adminUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create default admin user
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
			if err != nil {
				log.Fatalf("Failed to hash password: %v", err)
			}
			adminUser = models.User{
				ID:           uuid.New(),
				Username:     "admin",
				PasswordHash: string(hashedPassword),
				Role:         "super_admin", // Assign super_admin role
			}
			if err := db.Create(&adminUser).Error; err != nil {
				log.Fatalf("Failed to create default admin user: %v", err)
			}
			log.Println("Default admin user created with username 'admin' and password 'admin123'")
		} else {
			log.Fatalf("Failed to query admin user: %v", err)
		}
	}

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.CORS())

	r.GET("/health", func(c *gin.Context) {
		response.Success(c, gin.H{"status": "ok"}, "服务运行正常")
	})

	adminHandler := handlers.NewAdminHandler(db)
	exposureModuleHandler := handlers.NewAdminExposureModuleHandler(db)
	adminVideoHandler := handlers.NewAdminVideoHandler(db)
	adminPermissionHandler := handlers.NewAdminPermissionHandler(db)

	api := r.Group("/api/v1")
	{
		// 管理员登录
		api.POST("/admin/login", adminHandler.Login)

		// 测试根路由
		api.GET("/test-root", adminHandler.TestRoute)

		// 需要认证的管理接口（简化版，实际应该使用JWT中间件）
		admin := api.Group("/admin")
		admin.Use(middleware.UserAuthMiddleware(db))
		admin.Use(middleware.AdminAuthMiddleware())
		{
			// 用户管理
			admin.GET("/users", adminHandler.GetUsers)
			admin.GET("/users/:id", adminHandler.GetUser)
			admin.POST("/users", adminHandler.CreateUser)
			admin.PUT("/users/:id", adminHandler.UpdateUser)
			admin.DELETE("/users/:id", adminHandler.DeleteUser)

			// 帖子管理
			admin.GET("/posts", adminHandler.GetPosts)
			admin.GET("/posts/:id", adminHandler.GetPost)
			admin.POST("/posts", adminHandler.CreatePost)
			admin.PUT("/posts/:id", adminHandler.UpdatePost)
			admin.POST("/posts/delete-batch", adminHandler.DeletePost)

			// 房间管理
			admin.GET("/rooms", adminHandler.GetRooms)
			admin.GET("/rooms/:id", adminHandler.GetRoom)
			admin.POST("/rooms", adminHandler.CreateRoom)
			admin.PUT("/rooms/:id", adminHandler.UpdateRoom)
			admin.DELETE("/rooms/:id", adminHandler.DeleteRoom)
			admin.POST("/rooms/delete-batch", adminHandler.DeleteRoom)
			admin.PATCH("/rooms/:id/toggle", adminHandler.ToggleRoom)

			// 训练统计
			admin.GET("/training/stats", adminHandler.GetTrainingStats)
			admin.GET("/training/detailed-stats", adminHandler.GetDetailedStats)
			admin.GET("/training/records", adminHandler.GetTrainingRecords)
			admin.GET("/training/records/:id", adminHandler.GetTrainingRecord)
			admin.PUT("/training/records/:id", adminHandler.UpdateTrainingRecord)
			admin.POST("/training/records/delete-batch", adminHandler.DeleteTrainingRecord)

			// 操作日志管理
			admin.GET("/operation-logs", adminHandler.GetOperationLogs)
			admin.GET("/operation-logs/:id", adminHandler.GetOperationLog)

			// 评论管理
			admin.GET("/comments", adminHandler.GetComments)
			admin.GET("/comments/:id", adminHandler.GetComment)
			admin.PUT("/comments/:id", adminHandler.UpdateComment)
			admin.POST("/comments/delete-batch", adminHandler.DeleteComment)

			// 关注/收藏管理
			admin.GET("/follows", adminHandler.GetFollows)
			admin.POST("/follows/delete-batch", adminHandler.DeleteFollow)
			admin.GET("/post-collections", adminHandler.GetPostCollections)
			admin.POST("/post-collections/delete-batch", adminHandler.DeletePostCollection)

			// 点赞管理
			admin.GET("/post-likes", adminHandler.GetPostLikes)
			admin.POST("/post-likes/delete-batch", adminHandler.DeletePostLike)

			// 绕口令管理
			admin.GET("/tongue-twisters", adminHandler.GetTongueTwisters)
			admin.GET("/tongue-twisters/:id", adminHandler.GetTongueTwister)
			admin.POST("/tongue-twisters", adminHandler.CreateTongueTwister)
			admin.POST("/tongue-twisters/batch-create", adminHandler.BatchCreateTongueTwisters)
			admin.PUT("/tongue-twisters/:id", adminHandler.UpdateTongueTwister)
			admin.POST("/tongue-twisters/delete-batch", adminHandler.DeleteTongueTwister)
			admin.DELETE("/tongue-twisters/all", adminHandler.DeleteAllTongueTwisters)
			admin.POST("/tongue-twisters/clean", adminHandler.CleanTongueTwisters)

			// 每日朗诵文案管理
			admin.GET("/daily-expressions", adminHandler.GetDailyExpressions)
			admin.GET("/daily-expressions/:id", adminHandler.GetDailyExpression)
			admin.POST("/daily-expressions", adminHandler.CreateDailyExpression)
			admin.POST("/daily-expressions/batch-create", adminHandler.BatchCreateDailyExpressions)
			admin.PUT("/daily-expressions/:id", adminHandler.UpdateDailyExpression)
			admin.POST("/daily-expressions/delete-batch", adminHandler.DeleteDailyExpression)

			// 语音技巧训练管理
			admin.GET("/speech-techniques", adminHandler.GetSpeechTechniques)
			admin.GET("/speech-techniques/:id", adminHandler.GetSpeechTechnique)
			admin.POST("/speech-techniques", adminHandler.CreateSpeechTechnique)
			admin.POST("/speech-techniques/batch-create", adminHandler.BatchCreateSpeechTechniques)
			admin.PUT("/speech-techniques/:id", adminHandler.UpdateSpeechTechnique)
			admin.POST("/speech-techniques/delete-batch", adminHandler.DeleteSpeechTechnique)

			// 成就管理
			admin.POST("/achievements", adminHandler.CreateAchievement)
			admin.GET("/achievements", adminHandler.GetAchievements)
			admin.GET("/achievements/:id", adminHandler.GetAchievement)
			admin.DELETE("/achievements/:id", adminHandler.DeleteAchievement)

			// 冥想进度管理
			admin.POST("/meditation-progress", adminHandler.CreateMeditationProgress)
			admin.GET("/meditation-progress", adminHandler.GetMeditationProgresses)
			admin.GET("/meditation-progress/:id", adminHandler.GetMeditationProgress)
			admin.PUT("/meditation-progress/:id", adminHandler.UpdateMeditationProgress)
			admin.DELETE("/meditation-progress/:id", adminHandler.DeleteMeditationProgress)

			// AI对话管理
			admin.GET("/ai-conversations", adminHandler.GetAIConversations)
			admin.GET("/ai-conversations/:id", adminHandler.GetAIConversation)
			admin.POST("/ai-conversations/delete-batch", adminHandler.DeleteAIConversation)

			// 验证码管理
			admin.GET("/verification-codes", adminHandler.GetVerificationCodes)
			admin.GET("/verification-codes/:id", adminHandler.GetVerificationCode)
			admin.POST("/verification-codes/delete-batch", adminHandler.DeleteVerificationCode)

			// 测试路由
			admin.GET("/test", adminHandler.TestRoute)

			// 用户设置管理
			admin.GET("/user-settings/:user_id", adminHandler.GetUserSettings)
			admin.PUT("/user-settings/:user_id", adminHandler.UpdateUserSettings)
			admin.GET("/user-settings", adminHandler.GetAllUserSettings)
			admin.POST("/user-settings/:user_id/reset", adminHandler.ResetUserSettings)

			// 用户反馈管理
			admin.GET("/feedback", adminHandler.GetFeedbackList)
			admin.GET("/feedback/:id", adminHandler.GetFeedback)
			admin.PUT("/feedback/:id/status", adminHandler.UpdateFeedbackStatus)
			admin.DELETE("/feedback/:id", adminHandler.DeleteFeedback)
			admin.GET("/feedback-stats", adminHandler.GetFeedbackStats)

			// 法律文档管理
			admin.GET("/legal-documents", adminHandler.GetLegalDocuments)
			admin.GET("/legal-documents/:id", adminHandler.GetLegalDocument)
			admin.POST("/legal-documents", adminHandler.CreateLegalDocument)
			admin.PUT("/legal-documents/:id", adminHandler.UpdateLegalDocument)
			admin.DELETE("/legal-documents/:id", adminHandler.DeleteLegalDocument)

			// AI角色管理
			admin.GET("/ai-roles", adminHandler.GetAIRoles)
			admin.POST("/ai-roles", adminHandler.CreateAIRole)
			admin.PUT("/ai-roles/:id", adminHandler.UpdateAIRole)
			admin.DELETE("/ai-roles/:id", adminHandler.DeleteAIRole)
			admin.POST("/ai-roles/init-from-config", adminHandler.InitAIRolesFromConfig)

			// 音色管理（在AI管理下）
			admin.GET("/voice-types", adminHandler.GetVoiceTypes)
			admin.GET("/voice-types/enabled", adminHandler.GetEnabledVoiceTypes)
			admin.GET("/voice-types/:id", adminHandler.GetVoiceType)
			admin.POST("/voice-types", adminHandler.CreateVoiceType)
			admin.PUT("/voice-types/:id", adminHandler.UpdateVoiceType)
			admin.DELETE("/voice-types/:id", adminHandler.DeleteVoiceType)

			// 脱敏练习管理
			exposureManagement := admin.Group("/exposure")
			{
				// 场景管理
				exposureManagement.GET("/modules", exposureModuleHandler.GetModules)
				exposureManagement.POST("/modules", exposureModuleHandler.CreateModule)
				// 批量更新顺序必须在 /modules/:id 之前，否则会匹配到 :id
				exposureManagement.PUT("/modules/order", exposureModuleHandler.BatchUpdateModulesOrder)
				exposureManagement.GET("/modules/:id", exposureModuleHandler.GetModule)
				exposureManagement.PUT("/modules/:id", exposureModuleHandler.UpdateModule)
				exposureManagement.DELETE("/modules/:id", exposureModuleHandler.DeleteModule)

				// 步骤管理
				exposureManagement.GET("/modules/:id/steps", exposureModuleHandler.GetModuleSteps)
				exposureManagement.POST("/modules/:id/steps", exposureModuleHandler.CreateStep)
				exposureManagement.PUT("/modules/:id/steps/order", exposureModuleHandler.BatchUpdateStepsOrder)
				exposureManagement.PUT("/steps/:step_id", exposureModuleHandler.UpdateStep)
				exposureManagement.DELETE("/steps/:step_id", exposureModuleHandler.DeleteStep)
			}

			// 视频管理
			admin.GET("/videos", adminVideoHandler.GetVideoList)
			admin.GET("/videos/:id", adminVideoHandler.GetVideoDetail)
			admin.DELETE("/videos/:id", adminVideoHandler.DeleteVideo)
			admin.POST("/videos/batch-delete", adminVideoHandler.BatchDeleteVideos)

			// 权限管理 - 角色管理
			admin.GET("/roles", adminPermissionHandler.GetRoles)
			admin.GET("/roles/:id", adminPermissionHandler.GetRole)
			admin.POST("/roles", adminPermissionHandler.CreateRole)
			admin.PUT("/roles/:id", adminPermissionHandler.UpdateRole)
			admin.DELETE("/roles/:id", adminPermissionHandler.DeleteRole)

			// 权限管理 - 菜单管理
			admin.GET("/menus", adminPermissionHandler.GetMenus)
			admin.GET("/menus/:id", adminPermissionHandler.GetMenu)
			admin.POST("/menus", adminPermissionHandler.CreateMenu)
			admin.PUT("/menus/:id", adminPermissionHandler.UpdateMenu)
			admin.DELETE("/menus/:id", adminPermissionHandler.DeleteMenu)
		}
	}

	addr := ":" + cfg.Port
	log.Printf("Admin API Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
