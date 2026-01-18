package main

import (
	"log"
	"fluent-life-admin-api/internal/config"
	"fluent-life-admin-api/internal/models"
	"github.com/google/uuid"
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

	// 自动迁移
	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// 删除所有现有音色数据
	log.Println("开始删除所有现有音色数据...")
	result := db.Exec("DELETE FROM voice_types")
	if result.Error != nil {
		log.Fatalf("删除音色数据失败: %v", result.Error)
	}
	log.Printf("✓ 已删除 %d 条音色数据", result.RowsAffected)

	// 火山引擎豆包语音合成模型 2.0 常用音色列表（8个推荐音色）
	// 参考文档: https://www.volcengine.com/docs/6561/1257544?lang=zh
	voiceTypes := []models.VoiceType{
		{
			Name:        "Vivi 2.0 通用",
			Type:        "zh_female_vv_uranus_bigtts",
			Description: "通用女声，中文/英语混合，适合多语言场景",
			Enabled:     true,
		},
		{
			Name:        "小何 2.0 通用",
			Type:        "zh_female_xiaohe_uranus_bigtts",
			Description: "通用女声，中文，适合日常对话和内容朗读",
			Enabled:     true,
		},
		{
			Name:        "云舟 2.0 通用",
			Type:        "zh_male_m191_uranus_bigtts",
			Description: "通用男声，中文，适合知识讲解和正式场合",
			Enabled:     true,
		},
		{
			Name:        "儿童绘本",
			Type:        "zh_female_xueayi_saturn_bigtts",
			Description: "精品克隆音色，适合儿童内容、绘本朗读",
			Enabled:     true,
		},
		{
			Name:        "大壹",
			Type:        "zh_male_dayi_saturn_bigtts",
			Description: "精品克隆音色，适合角色扮演和内容创作",
			Enabled:     true,
		},
		{
			Name:        "黑猫侦探社咪",
			Type:        "zh_female_mizai_saturn_bigtts",
			Description: "精品克隆音色，适合故事讲述和角色配音",
			Enabled:     true,
		},
		{
			Name:        "鸡汤女",
			Type:        "zh_female_jitangnv_saturn_bigtts",
			Description: "精品克隆音色，适合情感表达和心灵鸡汤类内容",
			Enabled:     true,
		},
		{
			Name:        "魅力女友",
			Type:        "zh_female_meilinvyou_saturn_bigtts",
			Description: "精品克隆音色，适合视频配音和互动场景",
			Enabled:     true,
		},
	}

	log.Println("开始插入新的音色类型...")

	// 批量创建新音色类型
	for _, vt := range voiceTypes {
		// 设置ID
		if vt.ID == uuid.Nil {
			vt.ID = uuid.New()
		}

		// 创建新音色类型
		if err := db.Create(&vt).Error; err != nil {
			log.Fatalf("创建音色类型 %s 失败: %v", vt.Name, err)
		}

		log.Printf("✓ 成功创建音色类型: %s (%s)", vt.Name, vt.Type)
	}

	log.Printf("音色类型初始化完成！共插入 %d 个音色", len(voiceTypes))
}
