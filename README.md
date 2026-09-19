# MinhNhat Bot Panel

Chạy **toàn bộ bot Python** (prefix `.`) qua web: dán token → Start.

## Chạy

```bash
cd minhnhat-bot
npm install
npm start
```

Cần **Python 3** + `python3-venv`.

http://localhost:3000

## Discord

Bật Intent: Message Content, Server Members, Presence, Voice States.

Trên server: `.menu` · `.help` · `.dev`

## API keys (tuỳ chọn)

Đã **gỡ key cứng** khỏi code. Nếu dùng AI / ảnh / NASA… đặt env:

```bash
export OPENROUTER_API_KEY=...
export POLLINATIONS_API_KEY=...
export NASA_API_KEY=...
export TEMPMAIL_API_KEY=...
export LUA_OBF_API_KEY=...
```

**Quan trọng:** Các key từng dán trong file bot đã lộ — hãy **đổi/rotate** trên dashboard nhà cung cấp.

## File chính

- `bot_template.py` — full lệnh bot của bạn
- `server.js` — panel Start/Stop
- `requirements.txt` — discord.py, aiohttp, Pillow
