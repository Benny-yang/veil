package email

import (
	"github.com/resend/resend-go/v2"
)

type Service struct {
	client    *resend.Client
	fromEmail string
	appEnv    string
}

func NewService(apiKey, fromEmail, appEnv string) *Service {
	return &Service{
		client:    resend.NewClient(apiKey),
		fromEmail: fromEmail,
		appEnv:    appEnv,
	}
}

// SendEmailVerification 發送 Email 驗證信（註冊後必須驗證才能登入）
func (s *Service) SendEmailVerification(toEmail, verifyToken, baseURL string) error {
	verifyLink := baseURL + "/verify-email?token=" + verifyToken

	html := `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#2c2c2c">
  <h2 style="color:#8C8479">驗證你的 Veil 帳號</h2>
  <p>感謝你註冊 Veil！請點擊下方連結完成信箱驗證：</p>
  <a href="` + verifyLink + `"
     style="display:inline-block;padding:12px 24px;background:#C4A882;color:white;text-decoration:none;border-radius:8px;margin:16px 0">
    驗證信箱
  </a>
  <p style="color:#999;font-size:13px">此連結將在 24 小時後失效。<br>若你未申請此帳號，請忽略此信。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#bbb;font-size:12px">Veil — 真實的風格交流空間</p>
</body></html>`

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    "Veil <" + s.fromEmail + ">",
		To:      []string{toEmail},
		Subject: "【Veil】請驗證你的信箱",
		Html:    html,
	})
	return err
}

// SendPasswordReset 發送密碼重設信
func (s *Service) SendPasswordReset(toEmail, resetToken, baseURL string) error {
	resetLink := baseURL + "/reset-password?token=" + resetToken

	html := `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#2c2c2c">
  <h2 style="color:#8C8479">Veil 密碼重設</h2>
  <p>你好，我們收到你的密碼重設請求，請點擊下方連結重設密碼：</p>
  <a href="` + resetLink + `"
     style="display:inline-block;padding:12px 24px;background:#C4A882;color:white;text-decoration:none;border-radius:8px;margin:16px 0">
    重設密碼
  </a>
  <p style="color:#999;font-size:13px">此連結將在 1 小時後失效。<br>若你未申請密碼重設，請忽略此信。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#bbb;font-size:12px">Veil — 真實的風格交流空間</p>
</body></html>`

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    "Veil <" + s.fromEmail + ">",
		To:      []string{toEmail},
		Subject: "【Veil】密碼重設申請",
		Html:    html,
	})
	return err
}

// SendWelcome 驗證完成後發送歡迎信
func (s *Service) SendWelcome(toEmail, displayName string) error {
	html := `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#2c2c2c">
  <h2 style="color:#8C8479">歡迎加入 Veil 🎉</h2>
  <p>` + displayName + `，你好！信箱驗證完成，歡迎加入 Veil。</p>
  <p>Veil 是一個屬於真實品味的二手時裝交流空間，開始探索屬於你的風格吧。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#bbb;font-size:12px">Veil — 真實的風格交流空間</p>
</body></html>`

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    "Veil <" + s.fromEmail + ">",
		To:      []string{toEmail},
		Subject: "【Veil】歡迎加入",
		Html:    html,
	})
	return err
}
