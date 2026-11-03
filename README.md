# PROJECT HANDOFF – HTTT08

## 1. Thông tin dự án

**Tên đề tài:** Xây dựng website Quản lý Tuyển dụng Nhân sự, tích hợp API trích xuất dữ liệu từ CV và tin tuyển dụng (HTTT08).

**Mục tiêu:** Xây dựng website tuyển dụng có chức năng quản lý tin tuyển dụng, ứng viên, hồ sơ ứng tuyển và sử dụng API để trích xuất thông tin, phân tích và chấm điểm CV tự động.

## 2. Công nghệ sử dụng

- Backend: Python + FastAPI.
- Frontend: React.
- Database: PostgreSQL.
- ORM: SQLAlchemy 2.
- Migration: Alembic.
- Authentication: JWT.
- Kiến trúc: OOP, phân chia API, Models, Schemas, Services.

## 3. Cấu trúc dự án

```text
HTTT_08/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── storage/
│   ├── .env
│   └── requirements.txt
└── frontend/
```

Repo GitHub: `LeDinhHoang-tncc/httt_08-hr`

Chạy backend:

```bash
python -m uvicorn app.main:app --app-dir backend --reload
```

Swagger: `http://127.0.0.1:8000/docs`

## 4. Các chức năng backend đã hoàn thành

### Authentication
- Đăng ký, đăng nhập.
- JWT access token.
- Lấy thông tin người dùng hiện tại.
- Token hết hạn sau 30 phút.

### Jobs
- Tạo tin tuyển dụng.
- Xem danh sách tin tuyển dụng.
- Xem chi tiết tin tuyển dụng.
- Cập nhật tin tuyển dụng.
- Xóa tin tuyển dụng.

### Applications
- Tạo hồ sơ ứng tuyển.
- Xem danh sách hồ sơ.
- Xem chi tiết hồ sơ.
- Cập nhật trạng thái ứng tuyển.
- Kiểm tra tin tuyển dụng tồn tại.
- Ngăn ứng viên ứng tuyển trùng một công việc.

Các API cơ bản đã được kiểm thử trên Swagger.

**Lưu ý:** Phân quyền giữa ứng viên và nhà tuyển dụng chưa hoàn thiện. Người tạo tin tuyển dụng hiện chưa có đầy đủ quyền xem và quản lý hồ sơ ứng viên. Đã quyết định để phần phân quyền hoàn thiện sau.

## 5. Thiết kế nghiệp vụ CV đã thống nhất

Có hai phần độc lập:

- Hồ sơ cá nhân: quản lý thông tin cá nhân, học vấn, kinh nghiệm, kỹ năng.
- CV ứng tuyển: mỗi lần ứng tuyển phải upload một file CV mới riêng biệt.

Quy tắc:
1. Mỗi lần ứng tuyển bắt buộc upload một CV mới.
2. Mỗi hồ sơ ứng tuyển chỉ gắn với một CV.
3. CV được lưu riêng trên máy chủ Backend.
4. PostgreSQL lưu đường dẫn và thông tin file.
5. CV đã nộp không được tự động thay đổi khi ứng viên cập nhật hồ sơ cá nhân.
6. CV không lưu vĩnh viễn vô điều kiện; sẽ có chính sách lưu trữ và xóa dữ liệu sau.
7. Chưa cần tạo bảng Resume riêng. Trước mắt quản lý CV trực tiếp từ bảng Applications.

## 6. Công việc đang thực hiện

**Giai đoạn: Xây dựng API upload CV và quản lý file an toàn.**

Đã cài thư viện:

```bash
pip install python-multipart
```

Đã được hướng dẫn tạo file:

`backend/app/services/file_service.py`

File này có nhiệm vụ:
- Chỉ nhận PDF và DOCX.
- Giới hạn dung lượng 5 MB.
- Kiểm tra chữ ký PDF.
- Kiểm tra cấu trúc DOCX.
- Tạo tên file ngẫu nhiên bằng UUID.
- Lưu file vào `backend/storage/cvs/`.
- Trả về đường dẫn tương đối để lưu vào PostgreSQL.

Code file_service.py đã được cung cấp trong cuộc trò chuyện trước, nhưng cần xác nhận lại người dùng đã tạo và lưu file thành công hay chưa.

## 7. Công việc tiếp theo

Tiếp tục từng bước:

1. Xác nhận đã tạo `file_service.py`.
2. Điều chỉnh model Application để lưu thêm tên file gốc và thời điểm upload nếu cần.
3. Điều chỉnh schema.
4. Tích hợp upload CV vào API `POST /api/applications` bằng `multipart/form-data`.
5. Đảm bảo nếu tạo hồ sơ ứng tuyển thất bại thì file đã upload không bị bỏ lại.
6. Xây dựng API tải CV có kiểm tra quyền truy cập.
7. Xây dựng chức năng xóa CV an toàn.
8. Kiểm thử trên Swagger.

Sau đó tiếp tục các chức năng xử lý CV bằng API trích xuất dữ liệu và chấm điểm ứng viên.

## 8. Cách hướng dẫn mong muốn

- Giải thích bằng tiếng Việt đơn giản, từng bước.
- Không đưa quá nhiều công việc trong một lần.
- Giải thích rõ mỗi file dùng để làm gì.
- Ưu tiên cách triển khai đơn giản, phù hợp dự án sinh viên.
- Không tự ý thay đổi kiến trúc hoặc thêm Repository Pattern vì dự án hiện tại không sử dụng.
- Không triển khai phân quyền nâng cao trước khi đến giai đoạn đó.
- Sau mỗi bước, hướng dẫn kiểm thử và chờ tôi xác nhận hoàn thành rồi mới chuyển bước tiếp theo.
- Khi sửa code, cần dựa trên code hiện tại của tôi, không tự giả định cấu trúc hoặc nội dung file.
