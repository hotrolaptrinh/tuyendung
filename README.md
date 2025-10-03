# Trình tạo hình ảnh bài đăng tuyển dụng

Ứng dụng web tĩnh giúp chọn công việc từ các tệp JSON, dựng bài tuyển dụng theo layout có sẵn và xuất thành ảnh PNG.

## Cách chạy

1. Cài đặt một máy chủ tĩnh (ví dụ `npm install -g serve`) hoặc sử dụng bất kỳ công cụ nào tương đương.
2. Khởi chạy máy chủ từ thư mục dự án:
   ```bash
   serve .
   ```
3. Mở trình duyệt truy cập địa chỉ hiển thị (mặc định `http://localhost:3000`).

> ⚠️ Do trình duyệt chặn việc đọc tệp `file://`, hãy chạy thông qua máy chủ tĩnh để `fetch` được dữ liệu JSON.

## Cấu trúc dữ liệu

- `data/jobs/index.json`: liệt kê các tệp công việc.
- `data/jobs/*.json`: thông tin chi tiết từng vị trí (tiêu đề, mô tả, phúc lợi, liên hệ...).
- `data/layouts.json`: cấu hình các layout (tiêu đề, tagline, nhãn phần footer...).

Bạn có thể bổ sung/chỉnh sửa dữ liệu bằng cách cập nhật các tệp JSON tương ứng, giao diện sẽ hiển thị lại ngay khi tải trang.

## Tính năng chính

- Lựa chọn nhiều vị trí (checkbox) và layout mong muốn (radio).
- Render nội dung tuyển dụng theo layout với phần header, phúc lợi, danh sách công việc, footer thông tin ứng tuyển.
- Tùy chọn bật/tắt lưới canh chỉnh.
- Xuất bản xem trước thành ảnh PNG bằng 1 click.
