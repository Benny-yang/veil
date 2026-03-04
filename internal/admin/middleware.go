package admin

import (
	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Auth 驗證 admin JWT middleware
func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			response.Unauthorized(c, "請提供管理者 Token")
			c.Abort()
			return
		}
		tokenStr := authHeader[7:]

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			response.Unauthorized(c, "Token 無效或已過期")
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || claims["type"] != "admin" {
			response.Unauthorized(c, "非管理者 Token")
			c.Abort()
			return
		}

		c.Set("admin_id", claims["sub"])
		c.Set("admin_username", claims["username"])
		c.Next()
	}
}
