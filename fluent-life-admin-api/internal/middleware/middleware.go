package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"fluent-life-admin-api/internal/models"
	"fluent-life-admin-api/pkg/auth"
	"fluent-life-admin-api/pkg/response"
)

// UserAuthMiddleware extracts user information from the JWT token and stores it in the Gin context.
func UserAuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" || !strings.HasPrefix(tokenString, "Bearer ") {
			response.Error(c, http.StatusUnauthorized, "Authorization token required")
			c.Abort()
			return
		}

		tokenString = strings.TrimPrefix(tokenString, "Bearer ")

		claims, err := auth.ParseToken(tokenString)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "Invalid token")
			c.Abort()
			return
		}

		var user models.User
		if err := db.Where("id = ?", claims.UserID).First(&user).Error; err != nil {
			response.Error(c, http.StatusUnauthorized, "User not found")
			c.Abort()
			return
		}

		c.Set("userID", user.ID)
		c.Set("username", user.Username)
		c.Set("userRole", user.Role) // Store user role in context
		c.Next()
	}
}

// AdminAuthMiddleware checks if the authenticated user has an admin role.
func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			response.Error(c, http.StatusUnauthorized, "User role not found in context")
			c.Abort()
			return
		}

		role, ok := userRole.(string)
		if !ok || (role != "admin" && role != "super_admin") {
			response.Error(c, http.StatusForbidden, "Access denied: Admin or Super Admin role required")
			c.Abort()
			return
		}
		c.Next()
	}
}
