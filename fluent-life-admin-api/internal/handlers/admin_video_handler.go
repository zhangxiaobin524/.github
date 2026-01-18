package handlers

import (
	"encoding/json"
	"fluent-life-admin-api/internal/models"
	"fluent-life-admin-api/pkg/response"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AdminVideoHandler struct {
	db *gorm.DB
}

func NewAdminVideoHandler(db *gorm.DB) *AdminVideoHandler {
	return &AdminVideoHandler{db: db}
}

// VideoListItem 视频列表项
type VideoListItem struct {
	ID           string `json:"id"`
	VideoURL     string `json:"video_url"`
	UserID       string `json:"user_id"`
	Username     string `json:"username"`
	Source       string `json:"source"`        // 来源：exposure_module, community_post
	SourceDetail string `json:"source_detail"` // 来源详情：如"帮助他人"模块、"感悟广场"
	ModuleID     string `json:"module_id,omitempty"`
	ModuleTitle  string `json:"module_title,omitempty"`
	PostID       string `json:"post_id,omitempty"`
	PostTitle    string `json:"post_title,omitempty"`
	CreatedAt    string `json:"created_at"`
	Duration     int    `json:"duration,omitempty"`
}

// GetVideoList 获取视频列表（管理员）
// GET /api/v1/admin/videos?page=1&page_size=20&source=&user_id=&module_id=
func (h *AdminVideoHandler) GetVideoList(c *gin.Context) {
	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	source := c.Query("source") // exposure_module, community_post
	userIDStr := c.Query("user_id")
	moduleIDStr := c.Query("module_id")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	var videos []VideoListItem
	var total int64

	// 从训练记录获取视频（脱敏练习）
	if source == "" || source == "exposure_module" {
		var trainingRecords []struct {
			ID          uuid.UUID
			UserID      uuid.UUID
			DataStr     string `gorm:"column:data"`
			Duration    int
			CreatedAt   time.Time
			Username    string
			ModuleID    string
			ModuleTitle string
		}

		trainingQuery := h.db.Table("training_records").
			Select("training_records.id, training_records.user_id, training_records.data, training_records.duration, training_records.created_at, users.username").
			Joins("LEFT JOIN users ON training_records.user_id = users.id").
			Where("training_records.data->>'video_url' IS NOT NULL AND training_records.data->>'video_url' != ''").
			Where("training_records.type = ?", "exposure")

		if userIDStr != "" {
			userID, err := uuid.Parse(userIDStr)
			if err == nil {
				trainingQuery = trainingQuery.Where("training_records.user_id = ?", userID)
			}
		}

		if err := trainingQuery.
			Order("training_records.created_at DESC").
			Limit(pageSize).
			Offset(offset).
			Scan(&trainingRecords).Error; err == nil {

			for _, record := range trainingRecords {
				videoURL := ""
				moduleID := ""
				moduleTitle := ""

				// 解析JSONB数据
				if record.DataStr != "" {
					var data map[string]interface{}
					if err := json.Unmarshal([]byte(record.DataStr), &data); err == nil {
						if url, ok := data["video_url"].(string); ok {
							videoURL = url
						}
						if mid, ok := data["module_id"].(string); ok {
							moduleID = mid
						}
						if mtitle, ok := data["step_title"].(string); ok {
							moduleTitle = mtitle
						}
					}
				}

				// 如果指定了module_id，进行过滤
				if moduleIDStr != "" && moduleID != moduleIDStr {
					continue
				}

				// 获取模块标题
				if moduleID != "" {
					var module models.ExposureModule
					if err := h.db.Where("id = ?", moduleID).First(&module).Error; err == nil {
						moduleTitle = module.Title
					}
				}

				if videoURL != "" {
					videos = append(videos, VideoListItem{
						ID:           record.ID.String(),
						VideoURL:     videoURL,
						UserID:       record.UserID.String(),
						Username:     record.Username,
						Source:       "exposure_module",
						SourceDetail: "脱敏练习",
						ModuleID:     moduleID,
						ModuleTitle:  moduleTitle,
						CreatedAt:    record.CreatedAt.Format("2006-01-02 15:04:05"),
						Duration:     record.Duration,
					})
				}
			}
		}
	}

	// 从社区帖子获取视频（感悟广场）
	if source == "" || source == "community_post" {
		var posts []struct {
			ID        uuid.UUID
			UserID    uuid.UUID
			MediaURL  string `gorm:"column:image"` // 使用image列名，但映射到MediaURL字段
			Content   string
			CreatedAt time.Time
			Username  string
		}

		postQuery := h.db.Table("posts").
			Select("posts.id, posts.user_id, posts.image, posts.content, posts.created_at, users.username").
			Joins("LEFT JOIN users ON posts.user_id = users.id").
			Where("posts.image IS NOT NULL AND posts.image != ''").
			Where("(posts.image LIKE ? OR posts.image LIKE ?)", "%.webm%", "%.mp4%")

		if userIDStr != "" {
			userID, err := uuid.Parse(userIDStr)
			if err == nil {
				postQuery = postQuery.Where("posts.user_id = ?", userID)
			}
		}

		if err := postQuery.
			Order("posts.created_at DESC").
			Limit(pageSize).
			Offset(offset).
			Scan(&posts).Error; err == nil {

			for _, post := range posts {
				// 从content中提取标题（取前50个字符）
				postTitle := post.Content
				if len(postTitle) > 50 {
					postTitle = postTitle[:50] + "..."
				}

				videos = append(videos, VideoListItem{
					ID:           post.ID.String(),
					VideoURL:     post.MediaURL,
					UserID:       post.UserID.String(),
					Username:     post.Username,
					Source:       "community_post",
					SourceDetail: "感悟广场",
					PostID:       post.ID.String(),
					PostTitle:    postTitle,
					CreatedAt:    post.CreatedAt.Format("2006-01-02 15:04:05"),
				})
			}
		}
	}

	// 统计总数
	h.db.Table("training_records").
		Where("data->>'video_url' IS NOT NULL AND data->>'video_url' != ''").
		Where("type = ?", "exposure").
		Count(&total)

	var postCount int64
	h.db.Table("posts").
		Where("image IS NOT NULL AND image != ''").
		Where("(image LIKE ? OR image LIKE ?)", "%.webm%", "%.mp4%").
		Count(&postCount)
	total += postCount

	response.Success(c, gin.H{
		"videos":    videos,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}, "获取成功")
}

// GetVideoDetail 获取视频详情（管理员）
// GET /api/v1/admin/videos/:id
func (h *AdminVideoHandler) GetVideoDetail(c *gin.Context) {
	videoID := c.Param("id")
	source := c.Query("source") // exposure_module, community_post

	if source == "exposure_module" || source == "" {
		// 从训练记录获取
		var record models.TrainingRecord
		if err := h.db.Preload("User").Where("id = ?", videoID).First(&record).Error; err == nil {
			videoURL := ""
			moduleID := ""
			moduleTitle := ""

			if record.Data != nil {
				if url, ok := record.Data["video_url"].(string); ok {
					videoURL = url
				}
				if mid, ok := record.Data["module_id"].(string); ok {
					moduleID = mid
				}
			}

			if moduleID != "" {
				var module models.ExposureModule
				if err := h.db.Where("id = ?", moduleID).First(&module).Error; err == nil {
					moduleTitle = module.Title
				}
			}

			if videoURL != "" {
				response.Success(c, gin.H{
					"video": VideoListItem{
						ID:           record.ID.String(),
						VideoURL:     videoURL,
						UserID:       record.UserID.String(),
						Username:     record.User.Username,
						Source:       "exposure_module",
						SourceDetail: "脱敏练习",
						ModuleID:     moduleID,
						ModuleTitle:  moduleTitle,
						CreatedAt:    record.CreatedAt.Format("2006-01-02 15:04:05"),
						Duration:     record.Duration,
					},
				}, "获取成功")
				return
			}
		}
	}

	if source == "community_post" || source == "" {
		// 从社区帖子获取（使用原生SQL查询，因为Post模型可能没有Image字段）
		var postData struct {
			ID        uuid.UUID
			UserID    uuid.UUID
			Image     string
			Content   string
			CreatedAt time.Time
			Username  string
		}

		if err := h.db.Table("posts").
			Select("posts.id, posts.user_id, posts.image, posts.content, posts.created_at, users.username").
			Joins("LEFT JOIN users ON posts.user_id = users.id").
			Where("posts.id = ?", videoID).
			Where("posts.image IS NOT NULL AND posts.image != ''").
			Scan(&postData).Error; err == nil {

			if postData.Image != "" {
				// 从content中提取标题（取前50个字符）
				postTitle := postData.Content
				if len(postTitle) > 50 {
					postTitle = postTitle[:50] + "..."
				}

				response.Success(c, gin.H{
					"video": VideoListItem{
						ID:           postData.ID.String(),
						VideoURL:     postData.Image,
						UserID:       postData.UserID.String(),
						Username:     postData.Username,
						Source:       "community_post",
						SourceDetail: "感悟广场",
						PostID:       postData.ID.String(),
						PostTitle:    postTitle,
						CreatedAt:    postData.CreatedAt.Format("2006-01-02 15:04:05"),
					},
				}, "获取成功")
				return
			}
		}
	}

	response.Error(c, 404, "视频不存在")
}

// DeleteVideo 删除视频（管理员）
// DELETE /api/v1/admin/videos/:id?source=exposure_module|community_post
func (h *AdminVideoHandler) DeleteVideo(c *gin.Context) {
	videoID := c.Param("id")
	source := c.DefaultQuery("source", "")

	if source == "exposure_module" || source == "" {
		// 从训练记录删除（删除data中的video_url字段）
		var record models.TrainingRecord
		if err := h.db.Where("id = ?", videoID).First(&record).Error; err == nil {
			if record.Data != nil {
				if _, ok := record.Data["video_url"].(string); ok {
					// 清除video_url字段
					delete(record.Data, "video_url")
					if err := h.db.Model(&record).Update("data", record.Data).Error; err == nil {
						response.Success(c, nil, "视频删除成功")
						return
					}
				}
			}
		}
	}

	if source == "community_post" || source == "" {
		// 从社区帖子删除（删除image字段）
		var post models.Post
		if err := h.db.Where("id = ?", videoID).First(&post).Error; err == nil {
			// 使用原始SQL更新image字段为空
			if err := h.db.Exec("UPDATE posts SET image = '' WHERE id = ?", videoID).Error; err == nil {
				response.Success(c, nil, "视频删除成功")
				return
			}
		}
	}

	response.Error(c, 404, "视频不存在")
}

// BatchDeleteVideos 批量删除视频
// POST /api/v1/admin/videos/batch-delete
func (h *AdminVideoHandler) BatchDeleteVideos(c *gin.Context) {
	var req struct {
		VideoIDs []struct {
			ID     string `json:"id"`
			Source string `json:"source"` // exposure_module, community_post
		} `json:"video_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, "参数错误")
		return
	}

	successCount := 0
	failCount := 0

	for _, item := range req.VideoIDs {
		if item.Source == "exposure_module" {
			var record models.TrainingRecord
			if err := h.db.Where("id = ?", item.ID).First(&record).Error; err == nil {
				if record.Data != nil {
					if _, ok := record.Data["video_url"].(string); ok {
						delete(record.Data, "video_url")
						if err := h.db.Model(&record).Update("data", record.Data).Error; err == nil {
							successCount++
							continue
						}
					}
				}
			}
		} else if item.Source == "community_post" {
			if err := h.db.Exec("UPDATE posts SET image = '' WHERE id = ?", item.ID).Error; err == nil {
				successCount++
				continue
			}
		}
		failCount++
	}

	response.Success(c, gin.H{
		"success_count": successCount,
		"fail_count":    failCount,
	}, fmt.Sprintf("批量删除完成：成功 %d 个，失败 %d 个", successCount, failCount))
}
