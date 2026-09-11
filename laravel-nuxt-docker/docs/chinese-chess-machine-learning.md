# Hướng dẫn AI/Machine Learning cho Chinese Chess

Tài liệu này mô tả hệ thống AI của chế độ **Chinese Chess → Chơi với máy**, bao gồm Pikafish/NNUE, model fallback nội bộ, cấu hình, kiểm thử và hướng sinh dữ liệu self-play trong tương lai.

## 1. Kiến trúc hiện tại

Project có ba tầng chọn nước theo thứ tự ưu tiên:

1. **Pikafish + NNUE**: engine chính và mạnh nhất.
2. **Model ML nội bộ + Minimax**: fallback khi Pikafish lỗi hoặc timeout.
3. **Minimax frontend**: fallback cuối để game không bị treo.

```text
Người chơi đi
    ↓
Frontend sinh tất cả nước hợp lệ
    ↓
POST /api/chinese-chess/engine/best-move
    ↓
Laravel → Pikafish/NNUE → nước tốt nhất
    │
    └── lỗi/timeout → POST /api/chinese-chess/ml/predict
                         │
                         └── lỗi → Minimax frontend
    ↓
Frontend kiểm tra và áp dụng nước đi
```

Pikafish sử dụng network `pikafish.nnue` đóng gói trong Docker image. Engine không cần dataset bên ngoài để chơi.

Model JSON đã train nằm trong `backend/resources/ml/chinese-chess-model.json`. Model này cũng chạy độc lập, không cần giữ lại dữ liệu đã dùng để train.

## 2. Các file chính

| Thành phần | File | Vai trò |
|---|---|---|
| Chế độ chơi với máy | `frontend/app/pages/games/chinese-chess/index.vue` | Gọi engine, fallback và áp dụng nước |
| Sinh ứng viên | `frontend/app/utils/chinese-chess/advisor.ts` | Sinh nước hợp lệ, đặc trưng và Minimax |
| Chuyển FEN/UCI | `frontend/app/utils/chinese-chess/uci.ts` | Chuyển board frontend sang định dạng Pikafish |
| API Pikafish | `backend/app/Http/Controllers/Api/ChineseChessEngineController.php` | Validate và gọi engine nội bộ |
| API model fallback | `backend/app/Http/Controllers/Api/ChineseChessMlController.php` | Xếp hạng ứng viên bằng model JSON |
| HTTP bridge | `docker/pikafish/server.py` | Giữ tiến trình UCI chạy thường trực |
| Image engine | `docker/pikafish/Dockerfile` | Build Pikafish và đóng gói NNUE |
| Model fallback | `backend/resources/ml/chinese-chess-model.json` | Trọng số đang sử dụng |
| Trainer tùy chọn | `scripts/train-chinese-chess-ml.py` | Train lại model fallback từ JSONL |

## 3. Cài đặt project

Xem tài liệu riêng [Hướng dẫn setup source](./setup-source.md) để cài project trên máy mới, cấu hình môi trường, khởi động Docker và kiểm tra Pikafish/NNUE.

Không cần tải dataset hoặc chạy `ml-train` để sử dụng chế độ chơi với máy.

## 4. Pikafish/NNUE

### 4.1 Luồng một nước đi

Frontend chuyển bàn cờ sang FEN và từng ứng viên sang UCI:

```text
rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b - - 0 1
```

Laravel gọi service nội bộ:

```text
http://pikafish:8080/bestmove
```

Bridge giữ một tiến trình Pikafish chạy thường trực nên NNUE chỉ được nạp khi service khởi động. Các request được khóa tuần tự để không trộn dữ liệu UCI trên stdin/stdout.

Laravel chỉ chấp nhận `bestmove` nếu nước đó có trong danh sách ứng viên hợp lệ do frontend gửi lên.

### 4.2 Cấu hình tài nguyên

Đặt trong `.env` cùng cấp với `docker-compose.yml`:

```dotenv
PIKAFISH_ARCH=x86-64-sse41-popcnt
PIKAFISH_THREADS=1
PIKAFISH_HASH_MB=128
```

| Máy | `PIKAFISH_ARCH` |
|---|---|
| Intel/AMD 64-bit phổ thông | `x86-64-sse41-popcnt` |
| Intel/AMD cũ | `x86-64` |
| ARM64/Linux | `armv8` |

Sau khi đổi kiến trúc:

```bash
docker compose build --no-cache pikafish
docker compose up -d --force-recreate pikafish backend
```

### 4.3 Cấu hình độ khó

Đặt trong `backend/.env`:

```dotenv
CHINESE_CHESS_ENGINE_URL=http://pikafish:8080
CHINESE_CHESS_ENGINE_MOVE_TIME_MS=700
CHINESE_CHESS_ENGINE_TIMEOUT_SECONDS=5
```

| Mức gợi ý | Thời gian suy nghĩ |
|---|---:|
| Nhanh/nhẹ | 200–400 ms |
| Cân bằng | 600–1000 ms |
| Khó | 1500–3000 ms |
| Rất khó | 3000–5000 ms |

`CHINESE_CHESS_ENGINE_MOVE_TIME_MS` được giới hạn từ 100 đến 5000 ms. Timeout phải lớn hơn thời gian suy nghĩ.

Áp dụng thay đổi:

```bash
docker compose exec backend php artisan optimize:clear
docker compose restart backend
```

### 4.4 Version NNUE

Docker image đang pin:

- Commit Pikafish: `99793311968f59cf5be2dd03f646b25ab8ab56e3`.
- SHA-256 NNUE: `7d13d73569a9b571ba0eb20cf1596247bc2a42738967e61afef6482b231e900e`.

Không tự thay riêng file `.nnue` bằng network khác. Engine và network không tương thích sẽ làm Pikafish dừng với lỗi:

```text
Network evaluation parameters compatible with the engine must be available
```

Health check chạy một lượt tìm kiếm một node, vì vậy nó xác nhận cả tiến trình UCI lẫn khả năng nạp NNUE.

## 5. API Pikafish

### Request

```http
POST /api/chinese-chess/engine/best-move
Content-Type: application/json
```

```json
{
  "fen": "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b - - 0 1",
  "candidates": [
    { "id": "black-chariot-1:1:0", "uci": "a9a8" },
    { "id": "black-horse-1:2:0", "uci": "b9a7" },
    { "id": "black-horse-1:2:2", "uci": "b9c7" }
  ]
}
```

### Response

```json
{
  "candidate_id": "black-horse-1:2:2",
  "bestmove": "b9c7",
  "engine": {
    "name": "Pikafish dev-20260910-99793311",
    "depth": 20,
    "score_cp": 6,
    "nodes": 456763
  }
}
```

API trả HTTP 503 khi engine lỗi, timeout hoặc trả nước ngoài tập ứng viên. Frontend sẽ tự chuyển sang fallback.

## 6. Model ML fallback

### 6.1 Cơ chế

Model hiện tại là **pairwise logistic ranking**, không phải neural network. Nó xếp hạng các nước hợp lệ bằng bảy đặc trưng:

| Đặc trưng | Ý nghĩa |
|---|---|
| `capture_value` | Giá trị quân có thể ăn |
| `gives_check` | Nước tạo chiếu |
| `gives_checkmate` | Nước tạo chiếu bí |
| `material_balance` | Chênh lệch vật chất |
| `own_mobility` | Độ cơ động của bên đi |
| `opponent_mobility` | Độ cơ động còn lại của đối thủ |
| `piece_position` | Điểm vị trí của quân |

```text
score = bias + Σ(weight[feature] × candidate[feature])
```

Minimax kiểm tra lại nước được model chọn. Nếu nước đó kém nước chiến thuật tốt nhất quá 60 điểm, frontend sử dụng nước Minimax.

Model này nhẹ nhưng không hiểu toàn bộ cấu trúc bàn cờ như NNUE, vì vậy không mạnh bằng Pikafish.

### 6.2 Model hiện có

File sau đã chứa model được train và đủ để fallback hoạt động:

```text
backend/resources/ml/chinese-chess-model.json
```

Các trường quan trọng:

- `version`: phiên bản model.
- `training_examples`: số mẫu đã dùng.
- `training_pairs`: số cặp dương/âm train.
- `validation_pairs`: số cặp validation.
- `validation_accuracy`: độ chính xác xếp hạng cặp validation.
- `weights`: trọng số của từng đặc trưng.

`validation_accuracy` không phải tỷ lệ thắng. Muốn đo sức cờ cần cho model đấu nhiều ván với cùng baseline, thời gian và phần cứng.

### 6.3 Train lại bằng dữ liệu JSONL khác

Pipeline cũ dùng dataset bên ngoài đã được gỡ bỏ. Trainer được giữ lại để có thể dùng với dữ liệu self-play trong tương lai.

Đặt dữ liệu tương thích tại:

```text
data/generated/chinese-chess-training.jsonl
```

Mỗi dòng cần có các trường tối thiểu:

```json
{
  "game_id": "selfplay-000001",
  "ply": 12,
  "features": {
    "capture_value": 0,
    "gives_check": 1,
    "gives_checkmate": 0,
    "material_balance": 0.2,
    "own_mobility": 0.31,
    "opponent_mobility": 0.24,
    "piece_position": 0.1
  },
  "label": 1
}
```

Trong cùng `game_id + ply` phải có:

- Một mẫu `label: 1`: nước được chọn.
- Một hoặc nhiều mẫu `label: 0`: các nước hợp lệ thay thế.

Train với cấu hình mặc định:

```bash
make ml-train
docker compose exec backend php artisan optimize:clear
```

Tùy chỉnh:

```bash
python3 scripts/train-chinese-chess-ml.py \
  data/generated/chinese-chess-training.jsonl \
  --output backend/resources/ml/chinese-chess-model.json \
  --epochs 60 \
  --learning-rate 0.02 \
  --regularization 0.0005
```

Mặc định:

| Tham số | Giá trị |
|---|---:|
| `--epochs` | 40 |
| `--learning-rate` | 0.03 |
| `--regularization` | 0.0005 |

Không cần build lại frontend hoặc Pikafish khi chỉ thay model JSON.

## 7. Sinh dữ liệu self-play trong tương lai

Có thể dùng hai tiến trình Pikafish tự đánh để sinh dữ liệu mới:

```text
Khai cuộc ngẫu nhiên
    ↓
Pikafish Đỏ ↔ Pikafish Đen
    ↓
FEN + ứng viên + score + kết quả
    ↓
Chuyển thành đặc trưng JSONL
    ↓
Train model fallback
```

Khuyến nghị:

- Dùng hai tiến trình UCI riêng, không dùng chung bridge web hiện tại.
- Random hóa khai cuộc hoặc chọn ngẫu nhiên trong top 2–3 nước đầu.
- Dùng `MultiPV` để lưu nhiều ứng viên và điểm đánh giá.
- Giới hạn số ply, xử lý hòa và loại ván trùng.
- Chia train/validation theo `game_id`, không chia ngẫu nhiên từng dòng.
- Không cho hai model fallback yếu tự đấu làm nguồn dữ liệu duy nhất vì chúng có thể khuếch đại lỗi của nhau.

Lưu ý: dùng đầu ra NNUE để tạo model dẫn xuất có thể chịu điều kiện giấy phép của Pikafish Networks. Cần kiểm tra giấy phép trước khi triển khai pipeline này.

## 8. Kiểm thử

Kiểm tra container:

```bash
docker compose ps pikafish
make pikafish-health
```

Xem log:

```bash
make pikafish-logs
```

Chạy test API:

```bash
docker compose exec backend php artisan test \
  --filter='ChineseChess(Engine|Ml)ApiTest'
```

Build frontend:

```bash
docker compose exec frontend npm run build
```

## 9. Xử lý lỗi

### Máy không hiển thị `Pikafish NNUE`

```bash
make pikafish-health
docker compose logs --tail=100 pikafish
docker compose logs --tail=100 backend
```

Kiểm tra `CHINESE_CHESS_ENGINE_URL`, cache Laravel và thời gian timeout.

### API trả HTTP 503

Nguyên nhân thường gặp:

- Container Pikafish chưa chạy.
- Engine/NNUE không tương thích.
- Kiến trúc binary không phù hợp CPU.
- Request vượt timeout.
- Engine trả nước ngoài tập nước hợp lệ.

Khởi động lại:

```bash
docker compose up -d pikafish backend
docker compose exec backend php artisan optimize:clear
make pikafish-health
```

### `Illegal instruction`

Đổi target CPU trong `.env` root:

```dotenv
PIKAFISH_ARCH=x86-64
```

Sau đó:

```bash
docker compose build --no-cache pikafish
docker compose up -d --force-recreate pikafish backend
```

### Model JSON lỗi hoặc thiếu

Backend ghi log `Chinese Chess ML inference unavailable`. Kiểm tra:

```text
backend/resources/ml/chinese-chess-model.json
```

Pikafish không phụ thuộc file này. Nếu cả model và Pikafish lỗi, game vẫn fallback về Minimax.

## 10. Production

- Tăng `PIKAFISH_THREADS` sẽ tăng sức tìm kiếm và mức sử dụng CPU.
- Tăng `PIKAFISH_HASH_MB` sẽ tăng bộ nhớ bảng chuyển vị.
- Bridge hiện dùng một engine và xử lý tuần tự. Nhiều ván đồng thời nên dùng nhiều worker/replica và cân bằng tải.
- Không public trực tiếp cổng `8080`; chỉ Laravel trong Docker network nên gọi service.
- Theo dõi số lần fallback, timeout, CPU và memory.
- Giữ thời gian suy nghĩ thấp hơn timeout Laravel.

## 11. Giấy phép

- [Pikafish](https://github.com/official-pikafish/Pikafish) sử dụng GPLv3. Khi phân phối binary phải tuân thủ yêu cầu cung cấp giấy phép và mã nguồn tương ứng.
- [Pikafish Networks](https://github.com/official-pikafish/Networks) áp dụng giấy phép riêng cho `pikafish.nnue`; network chính thức không được sử dụng thương mại nếu chưa được cấp quyền.
- Không sử dụng engine hoặc network để hỗ trợ gian lận trong các trận đấu online.
