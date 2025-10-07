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
- `data/layouts.json`: cấu hình các layout (tiêu đề, tagline, nhãn phần footer, template HTML hiển thị).

Bạn có thể bổ sung/chỉnh sửa dữ liệu bằng cách cập nhật các tệp JSON tương ứng, giao diện sẽ hiển thị lại ngay khi tải trang.

## Tùy chỉnh layout bằng template HTML

Mỗi layout có thể định nghĩa cấu trúc hiển thị bằng thuộc tính `template` trong `data/layouts.json`. Chuỗi template sử dụng cú pháp `{{ }}` tương tự Blade/Twig (Mustache):

- `{{variable}}` hiển thị giá trị và tự động escape HTML.
- `{{{variable}}}` hiển thị giá trị dạng HTML thô (không escape).
- `{{#section}}...{{/section}}` lặp/hiển thị nội dung khi giá trị truthy (mảng, object, boolean `true`).
- `{{^section}}...{{/section}}` hiển thị khi giá trị falsy hoặc mảng trống.
- Bên trong vòng lặp có thể dùng `{{@index}}` để lấy chỉ số phần tử.

Ngữ cảnh (context) sẵn có trong template:

- `header`: `{ title, subtitle, company, tagline }`.
- `jobs`: mảng các công việc đã chọn, bao gồm các trường từ tệp JSON (`title`, `department`, `location`, `description`, `requirements`, ...).
- `benefits`: mảng phúc lợi gộp từ tất cả công việc, `hasBenefits` (boolean) giúp hiển thị có điều kiện.
- `primaryJob`: công việc đầu tiên được chọn, đã chuẩn hóa thêm `applyInstructions`, `applyDeadline`, `applyLinkUrl`, `contactPhone`, `interviewAddress`.
- `footer`: các nhãn từ layout cộng với dữ liệu thực tế (`applyInstructions`, `applyDeadline`, `applyLinkUrl`, `applyLinkLabel`, `interviewAddress`, `contactValue`, `contactPhone`).
- `company`, `tagline`, `layout` (đối tượng cấu hình gốc).

Ví dụ rút gọn:

```json
{
  "id": "custom",
  "name": "Layout mới",
  "template": "<header><h1>{{header.title}}</h1></header>\n<section>{{#jobs}}<h2>{{title}}</h2>{{/jobs}}</section>"
}
```

Sau khi lưu, bấm "Tải dữ liệu mới" hoặc tải lại trang để áp dụng thay đổi.

## Tính năng chính

- Lựa chọn nhiều vị trí (checkbox) và layout mong muốn (radio).
- Render nội dung tuyển dụng theo layout với phần header, phúc lợi, danh sách công việc, footer thông tin ứng tuyển.
- Tùy chọn bật/tắt lưới canh chỉnh.
- Xuất bản xem trước thành ảnh PNG bằng 1 click.
- Làm mới dữ liệu JSON ngay trong giao diện bằng nút "Tải dữ liệu mới".
