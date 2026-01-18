package config

import (
	"fmt"
	"os"
	"time"

	"github.com/spf13/viper"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Config struct {
	Environment string `mapstructure:"ENVIRONMENT"`
	Port        string `mapstructure:"PORT"`

	Database struct {
		Host     string `mapstructure:"DB_HOST"`
		Port     string `mapstructure:"DB_PORT"`
		User     string `mapstructure:"DB_USER"`
		Password string `mapstructure:"DB_PASSWORD"`
		Name     string `mapstructure:"DB_NAME"`
		SSLMode  string `mapstructure:"DB_SSLMODE"`
	} `mapstructure:",squash"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath("../configs")
	viper.AddConfigPath("../../configs")

	viper.AutomaticEnv()
	setDefaults()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("error reading config file: %w", err)
		}
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	overrideFromEnv(&cfg)
	return &cfg, nil
}

func setDefaults() {
	viper.SetDefault("ENVIRONMENT", "development")
	viper.SetDefault("PORT", "8082")
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("DB_USER", "postgres")
	viper.SetDefault("DB_PASSWORD", "postgres")
	viper.SetDefault("DB_NAME", "fluent_life")
	viper.SetDefault("DB_SSLMODE", "disable")
}

func overrideFromEnv(cfg *Config) {
	if env := os.Getenv("ENVIRONMENT"); env != "" {
		cfg.Environment = env
	}
	if port := os.Getenv("PORT"); port != "" {
		cfg.Port = port
	}
	if host := os.Getenv("DB_HOST"); host != "" {
		cfg.Database.Host = host
	}
	if port := os.Getenv("DB_PORT"); port != "" {
		cfg.Database.Port = port
	}
	if user := os.Getenv("DB_USER"); user != "" {
		cfg.Database.User = user
	}
	if password := os.Getenv("DB_PASSWORD"); password != "" {
		cfg.Database.Password = password
	}
	if name := os.Getenv("DB_NAME"); name != "" {
		cfg.Database.Name = name
	}
	if sslMode := os.Getenv("DB_SSLMODE"); sslMode != "" {
		cfg.Database.SSLMode = sslMode
	}
}

func InitDB(cfg *Config) (*gorm.DB, error) {
	var dsn string
	if cfg.Database.Password != "" {
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Shanghai",
			cfg.Database.Host,
			cfg.Database.User,
			cfg.Database.Password,
			cfg.Database.Name,
			cfg.Database.Port,
			cfg.Database.SSLMode,
		)
	} else {
		dsn = fmt.Sprintf(
			"host=%s user=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Shanghai",
			cfg.Database.Host,
			cfg.Database.User,
			cfg.Database.Name,
			cfg.Database.Port,
			cfg.Database.SSLMode,
		)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt: false, // 禁用预编译语句，避免表结构变更后的计划缓存问题
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}

