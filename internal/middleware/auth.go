package middleware

import (
	"strings"

	"github.com/benny-yang/veil-api/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const UserIDKey = "userID"

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			response.Unauthorized(c, "缺少或格式錯誤的授權 Token")
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			response.Unauthorized(c, "Token 無效或已過期")
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			response.Unauthorized(c, "Token 解析失敗")
			c.Abort()
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			response.Unauthorized(c, "Token 缺少用戶 ID")
			c.Abort()
			return
		}

		c.Set(UserIDKey, userID)
		c.Next()
	}
}

// GetUserID 從 Context 取得當前登入用戶 ID
func GetUserID(c *gin.Context) (string, bool) {
	v, exists := c.Get(UserIDKey)
	if !exists {
		return "", false
	}
	id, ok := v.(string)
	return id, ok
}

// OptionalAuth 取得 Token 但不強制（允許未登入）
func OptionalAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.Next()
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err == nil && token.Valid {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if userID, ok := claims["sub"].(string); ok && userID != "" {
					c.Set(UserIDKey, userID)
				}
			}
		}
		c.Next()
	}
}

// RequireSelf 確保只有本人才能操作（用於 /users/me 等）
func RequireSelf(c *gin.Context, targetUserID string) bool {
	callerID, ok := GetUserID(c)
	if !ok || callerID != targetUserID {
		response.Forbidden(c, "FORBIDDEN", "無操作權限")
		c.Abort()
		return false
	}
	return true
}
