# Tích hợp Cursor

Tích hợp KeyRouter với Cursor IDE để định tuyến request AI qua hệ thống routing thông minh của KeyRouter.

## Yêu cầu

- Cursor IDE đã cài đặt
- Tài khoản Cursor Pro (cần thiết cho custom API endpoint)
- Một URL HTTPS công khai trỏ tới instance KeyRouter của bạn (ví dụ qua tunnel ngrok hoặc cloudflared)
- API key từ KeyRouter dashboard

## ⚠️ Lưu ý Quan trọng

> **Yêu cầu URL công khai**: Cursor định tuyến request qua server của chính nó và không hỗ trợ endpoint `localhost`. Bạn phải expose instance KeyRouter cục bộ ra internet bằng tunnel (ví dụ ngrok hoặc cloudflared) và dùng URL HTTPS công khai đó ở đây.

> **Yêu cầu Cursor Pro**: Tính năng này yêu cầu tài khoản Cursor Pro để dùng custom API endpoint.

## Setup

### 1. Mở Cursor Settings

1. Mở Cursor IDE
2. Đi đến **Settings** (Cmd/Ctrl + ,)
3. Đi đến phần **Models**

### 2. Bật OpenAI API

1. Tìm option **OpenAI API key**
2. Bật toggle để kích hoạt cấu hình custom API

### 3. Cấu hình Base URL

Đặt base URL tới URL công khai của instance KeyRouter:

```
https://<host-tunnel-cua-ban>
```

**Các bước:**
1. Trong cài đặt Models, tìm field **Base URL**
2. Nhập URL công khai của tunnel (ví dụ: `https://abc123.ngrok.app`)
3. Click **Save**

### 4. Thêm API Key

1. Trong field **API Key**, nhập API key KeyRouter
2. Bạn có thể tìm API key trong KeyRouter dashboard tại **Settings → API Keys**
3. Click **Save**

### 5. Thêm Custom Model

1. Click nút **View All Models**
2. Click **Add Custom Model**
3. Nhập tên model từ cấu hình KeyRouter (ví dụ: `gpt-4`, `claude-opus-4-5`, v.v.)
4. Click **Add**

### 6. Chọn Model

1. Trong giao diện chat Cursor, click dropdown chọn model
2. Chọn custom model từ danh sách
3. Bắt đầu dùng KeyRouter với Cursor!

## Ví dụ Cấu hình

Cursor settings của bạn nên trông như sau:

```
OpenAI API: ✓ Enabled
Base URL: https://<host-tunnel-cua-ban>
API Key: sk-keyrouter-xxxxxxxxxxxxx
Custom Models: gpt-4, claude-opus-4-5, gemini-2.0-flash
```

## Model có sẵn

Bạn có thể dùng bất kỳ model nào đã cấu hình trong KeyRouter dashboard. Ví dụ phổ biến:

| Tên Model | Provider | Mô tả |
|------------|----------|-------------|
| `gpt-4` | OpenAI | GPT-4 Turbo |
| `gpt-4o` | OpenAI | GPT-4 Optimized |
| `claude-opus-4-5` | Anthropic | Claude Opus 4.5 |
| `claude-sonnet-4-5` | Anthropic | Claude Sonnet 4.5 |
| `gemini-2.0-flash` | Google | Gemini 2.0 Flash |

## Sử dụng

### Giao diện Chat

1. Mở Cursor chat (Cmd/Ctrl + L)
2. Chọn model từ dropdown
3. Bắt đầu chat với AI qua KeyRouter

### Tạo Code Inline

1. Chọn code trong editor
2. Nhấn Cmd/Ctrl + K
3. Nhập prompt
4. Cursor sẽ dùng KeyRouter để tạo code

### Giải thích Code

1. Chọn code trong editor
2. Nhấn Cmd/Ctrl + L
3. Hỏi "Explain this code"
4. Nhận giải thích AI qua KeyRouter

## Troubleshooting

### Lỗi "Invalid API Key"

1. Xác minh API key trong KeyRouter dashboard
2. Đảm bảo bạn sao chép đầy đủ key bao gồm prefix `sk-keyrouter-`
3. Kiểm tra API key chưa hết hạn
4. Thử tạo API key mới

### Lỗi "Model Not Found"

1. Xác minh tên model khớp chính xác với cấu hình KeyRouter
2. Kiểm tra kết nối provider đang hoạt động trong KeyRouter dashboard
3. Đảm bảo model có sẵn trong các provider đã kết nối
4. Thử dùng tên model đầy đủ (ví dụ: `openai/gpt-4` thay vì `gpt-4`)

### Lỗi Connection

1. Xác minh bạn đang dùng URL công khai của tunnel (ví dụ: `https://abc123.ngrok.app`)
2. Kiểm tra kết nối internet
3. Đảm bảo instance KeyRouter có thể truy cập tại URL công khai đó
4. Thử tắt VPN hoặc proxy nếu đang bật

### Localhost không hoạt động

> **Nhớ**: Cursor không hỗ trợ endpoint `localhost`. Expose instance KeyRouter cục bộ bằng tunnel (ví dụ ngrok hoặc cloudflared) và dùng URL HTTPS công khai tạo ra làm base URL.

## Setup Tunnel

Nếu bạn chạy KeyRouter cục bộ và muốn dùng với Cursor:

1. Bắt đầu một tunnel expose cổng KeyRouter cục bộ ra internet:
   ```bash
   # ví dụ với ngrok
   ngrok http 20131
   ```
   hoặc với cloudflared:
   ```bash
   cloudflared tunnel --url http://localhost:20131
   ```
2. Sao chép URL HTTPS công khai mà tunnel in ra (ví dụ: `https://abc123.ngrok.app`)
3. Dùng URL công khai đó làm Base URL trong Cursor settings
4. Giữ cả tunnel và KeyRouter chạy trong khi dùng Cursor

## Best Practices

1. **Dùng Model Aliases**: Tạo alias ngắn cho model thường dùng trong KeyRouter
2. **Theo dõi Usage**: Kiểm tra KeyRouter dashboard để xem thống kê và chi phí
3. **Xoay API Key**: Định kỳ xoay API key để bảo mật
4. **Test Model**: Thử các model khác nhau để tìm model tốt nhất cho use case
