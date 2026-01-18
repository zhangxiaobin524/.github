package models

import "gorm.io/gorm"

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&User{},
		&VerificationCode{},
		&TrainingRecord{},
		&MeditationProgress{},
		&Post{},
		&PostLike{},
		&Comment{},
		&CommentLike{},
		&Achievement{},
		&AIConversation{},
		&PracticeRoom{},
		&PracticeRoomMember{},
		&TongueTwister{},
		&DailyExpression{},
		&SpeechTechnique{},
		&OperationLog{},
		&UserSettings{},
		&Feedback{},
		&Follow{},
		&PostCollection{},
		&LegalDocument{},
		&AppSetting{},
		&VoiceType{},
		&Role{},
		&Menu{},
	)
}






