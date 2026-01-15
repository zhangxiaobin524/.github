package middleware

import (
	"net/http"
	"strings"

	"fluent-life-admin-api/pkg/response"

	"github.com/gin-gonic/gin"
)

// AdminAuthMiddleware 简单的管理员认证中间件
func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Error(c, http.StatusUnauthorized, "缺少认证信息")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			response.Error(c, http.StatusUnauthorized, "认证信息格式错误")
			c.Abort()
			return
		}

		token := parts[1]
		// 简化版：直接验证token是否为预设的admin_token_12345
		if token != "admin_token_12345" {
			response.Error(c, http.StatusUnauthorized, "无效的认证令牌")
			c.Abort()
			return
		}

		c.Next()
	}
}
