Combo Git hằng ngày
Trong Terminal của VS Code, tại thư mục dự án E:\3_Sang_T6\HTTT_08, chạy lần lượt:

1. Kiểm tra các file đã thay đổi
git status
2. Đưa các thay đổi vào vùng chuẩn bị commit
git add .
3. Lưu một mốc phiên bản
git commit -m "feat: describe your changes"
Ví dụ: git commit -m "feat: add CV upload feature"
4. Đẩy code lên GitHub
git push
Bạn có thể copy nguyên combo này để dùng mỗi ngày:

/
git status
git add .
git commit -m "feat: describe your changes"
git push
/

Chỉ cần đổi phần describe your changes thành nội dung bạn vừa làm.
Quy tắc đặt tên commit dễ nhớ
Tiền tố	Khi nào dùng	

Ví dụ:
////////////////
feat:	Thêm chức năng mới	feat: add job listing
fix:	Sửa lỗi	fix: correct login validation
style:	Chỉnh giao diện, định dạng	style: improve navbar layout
refactor:	Sắp xếp lại code, không đổi chức năng	refactor: organize CV services
docs:	Cập nhật tài liệu	docs: update README
chore:	Công việc cấu hình, bảo trì	chore: update gitignore
/////////////////

Ba điều cần nhớ
- git add .: chọn các thay đổi để lưu.
- git commit: lưu thay đổi thành một phiên bản trên máy tính.
- git push: tải các commit lên GitHub.
Nếu git commit báo nothing to commit, nghĩa là không có thay đổi mới để lưu. Nếu git push báo lỗi như rejected, fetch first hoặc conflict, hãy dừng lại và xử lý lỗi trước, đừng cố push bằng --force.

Mẹo cho dự án nhóm: Nếu có thành viên khác đẩy code lên cùng nhánh main, hãy đồng bộ trước khi push để tránh xung đột. Khi mới làm một mình trên nhánh main, combo trên thường là đủ.

Vậy là từ giờ, cứ code xong → git add . → git commit → git push. Bạn có thể lưu combo này vào README hoặc ghi chú riêng để dùng lâu dài.