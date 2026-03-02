package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/benny-yang/veil-api/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("設定載入失敗: %v", err)
	}

	log.Printf("🚀 Veil API 啟動 [%s] port: %s", cfg.AppEnv, cfg.AppPort)

	// TODO: 初始化路由（後續加入 Gin / Chi）
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","env":"%s"}`, cfg.AppEnv)
	})

	addr := ":" + cfg.AppPort
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("伺服器啟動失敗: %v", err)
	}
}
