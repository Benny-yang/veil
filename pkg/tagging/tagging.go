// Package tagging 提供共用的 hashtag 解析與 tag upsert 邏輯
package tagging

import (
	"fmt"
	"regexp"

	"github.com/benny-yang/veil-api/internal/model"
	"gorm.io/gorm"
)

var hashtagRegex = regexp.MustCompile(`#([\w\x{4e00}-\x{9fa5}]+)`)

// ExtractTags 從文字中提取所有 hashtag 名稱（去重）
func ExtractTags(text string) []string {
	matches := hashtagRegex.FindAllStringSubmatch(text, -1)
	seen := make(map[string]bool)
	var tags []string
	for _, m := range matches {
		name := m[1]
		if !seen[name] {
			seen[name] = true
			tags = append(tags, name)
		}
	}
	return tags
}

// 白名單：僅允許已知的 tag pivot 表名和欄位名
var allowedTables = map[string]bool{
	"work_tags": true,
	"zone_tags": true,
}

var allowedColumns = map[string]bool{
	"work_id": true,
	"zone_id": true,
}

// UpsertTags 將 tagNames 寫入 tags 表，並建立 content 與 tag 的 join 記錄
// tableName: "work_tags" 或 "zone_tags"（白名單驗證）
// contentIDCol: "work_id" 或 "zone_id"（白名單驗證）
// contentID: 對應的 work/zone UUID
func UpsertTags(tx *gorm.DB, tableName, contentIDCol, contentID string, tagNames []string) error {
	if len(tagNames) == 0 {
		return nil
	}

	// SQL injection 防禦：驗證 tableName 和 contentIDCol 為白名單值
	if !allowedTables[tableName] {
		return fmt.Errorf("tagging: 不允許的資料表名稱: %s", tableName)
	}
	if !allowedColumns[contentIDCol] {
		return fmt.Errorf("tagging: 不允許的欄位名稱: %s", contentIDCol)
	}

	// 清除舊的關聯
	if err := tx.Exec("DELETE FROM "+tableName+" WHERE "+contentIDCol+" = ?", contentID).Error; err != nil {
		return err
	}

	for _, name := range tagNames {
		var tag model.Tag
		// First or Create
		if err := tx.Where("name = ?", name).FirstOrCreate(&tag, model.Tag{Name: name}).Error; err != nil {
			return err
		}
		// 更新使用次數
		if err := tx.Model(&tag).UpdateColumn("usage_count", gorm.Expr("usage_count + 1")).Error; err != nil {
			return err
		}
		// 建立 join
		if err := tx.Exec(
			"INSERT IGNORE INTO "+tableName+" ("+contentIDCol+", tag_id) VALUES (?, ?)",
			contentID, tag.ID,
		).Error; err != nil {
			return err
		}
	}
	return nil
}
