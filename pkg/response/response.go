package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorBody  `json:"error,omitempty"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{Success: true, Data: data})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, Response{Success: true, Data: data})
}

func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

func BadRequest(c *gin.Context, code, message string) {
	c.JSON(http.StatusBadRequest, Response{
		Success: false,
		Error:   &ErrorBody{Code: code, Message: message},
	})
}

func Unauthorized(c *gin.Context, message string) {
	c.JSON(http.StatusUnauthorized, Response{
		Success: false,
		Error:   &ErrorBody{Code: "UNAUTHORIZED", Message: message},
	})
}

func Forbidden(c *gin.Context, code, message string) {
	c.JSON(http.StatusForbidden, Response{
		Success: false,
		Error:   &ErrorBody{Code: code, Message: message},
	})
}

func NotFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, Response{
		Success: false,
		Error:   &ErrorBody{Code: "NOT_FOUND", Message: message},
	})
}

func Conflict(c *gin.Context, code, message string) {
	c.JSON(http.StatusConflict, Response{
		Success: false,
		Error:   &ErrorBody{Code: code, Message: message},
	})
}

func UnprocessableEntity(c *gin.Context, code, message string) {
	c.JSON(http.StatusUnprocessableEntity, Response{
		Success: false,
		Error:   &ErrorBody{Code: code, Message: message},
	})
}

func TooManyRequests(c *gin.Context, code, message string) {
	c.JSON(http.StatusTooManyRequests, Response{
		Success: false,
		Error:   &ErrorBody{Code: code, Message: message},
	})
}

func InternalError(c *gin.Context) {
	c.JSON(http.StatusInternalServerError, Response{
		Success: false,
		Error:   &ErrorBody{Code: "INTERNAL_ERROR", Message: "伺服器發生錯誤，請稍後再試"},
	})
}
