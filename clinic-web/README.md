# MediCare Frontend

Frontend HTML, CSS và JavaScript thuần, không có bước build. Đăng ký, đăng nhập, khôi phục phiên và đăng xuất đã kết nối API thật. Các nghiệp vụ khác vẫn dùng dữ liệu demo.

## Mở giao diện

Chạy backend tại http://localhost:3000, sau đó chạy `npm start` trong thư mục `clinic-web` và mở http://127.0.0.1:5500. Không mở bằng `file://` khi dùng đăng nhập thật vì CORS.

Chọn **Đặt lịch khám ngay** hoặc **Đăng nhập** ở footer. Chọn **Chưa có tài khoản? Đăng ký**, nhập họ tên, email, mật khẩu và xác nhận mật khẩu. Đăng ký công khai chỉ tạo bệnh nhân; tài khoản nhân viên phải được quản trị cấp. Vai trò được lấy từ API, không còn bộ chọn vai trò demo.

API được cấu hình ở `js/auth.js` (`API_BASE`). Backend phải cho phép origin http://127.0.0.1:5500 trong `CORS_ORIGIN`. Server frontend chỉ phục vụ tài nguyên công khai, mặc định bind 127.0.0.1:5500; có thể đổi cổng bằng `PORT`, đồng thời cập nhật CORS tương ứng.

Token lưu trong sessionStorage theo tab, không lưu mật khẩu. Tải lại trang sẽ gọi API profile và làm mới token nếu cần. Đây là cấu hình phát triển local; triển khai thực tế cần HTTPS và đánh giá cơ chế cookie HttpOnly/CSP, không dùng dữ liệu sức khỏe thật để thử.

Kiểm thử auth thật: `npm run test:auth` (cần cả backend và frontend đang chạy). Bài test tạo tài khoản bệnh nhân `auth-test-<timestamp>@example.com` trong database local và giữ lại để đối chiếu; không phát sinh lịch khám hay hóa đơn.

Ảnh hero, font tiếng Việt, Lucide và thư viện QR đã được lưu trong dự án. Trang chủ và luồng demo hoạt động khi không có mạng. VietQR và liên kết hình ảnh CLS vẫn là tài nguyên bên ngoài như bản gốc.

## Cấu trúc

| Tệp                      | Trách nhiệm                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `index.html`             | Điểm vào, metadata, thứ tự tải script, vùng thông báo              |
| `css/fonts.css`          | Font Be Vietnam Pro cục bộ                                         |
| `css/style.css`          | Design tokens, bố cục, component, responsive, in phiếu             |
| `js/app.js`              | Dữ liệu demo, trạng thái, router và xử lý nghiệp vụ hiện có        |
| `js/ui.js`               | Component dùng chung, escape nội dung, focus, menu, cache biểu mẫu |
| `js/dialogs.js`          | Hộp thoại có label, validation HTML, Escape và quản lý focus       |
| `js/views.js`            | Trang chủ, đăng ký/đăng nhập, khung ứng dụng và hành trình người bệnh |
| `js/auth.js`             | API xác thực, phiên đăng nhập, refresh token và đăng xuất |
| `js/clinical-views.js`   | Hàng đợi, phiếu khám, kết quả CLS, đơn thuốc                       |
| `js/operations-views.js` | Tiếp nhận, thu ngân, báo cáo và danh mục quản trị                  |
| `js/vendor`              | Lucide 0.468.0 và qrcode-generator 2.0.4                           |
| `tests`                  | Kiểm tra hành vi, accessibility và ảnh chụp responsive             |

Giữ nguyên 10 khóa view của router. Các mục điều hướng cũ cùng dẫn về một màn hình được gom lại; các chức năng thực tế vẫn nằm trong màn hình tương ứng. Không thay API, schema hay route backend trong đợt redesign này.

## Kiểm thử

Yêu cầu Node.js và npm. Chạy trong thư mục `clinic-web`:

```sh
npm ci --workspaces=false
npx playwright install chromium
npm test
npm run test:visual
npm run test:a11y
```

Các bài kiểm tra giao diện cũ bên dưới mở trực tiếp `index.html` và được viết cho bộ chọn vai trò demo. Chúng cần cập nhật fixture đăng nhập trước khi dùng làm kiểm thử hồi quy cho bản tích hợp API; không coi kết quả cũ là kết quả kiểm thử bản hiện tại. Riêng `test:auth` gọi API thật và đã bao phủ đăng ký, profile lưu trong DB, phân vai giao diện, refresh, đăng xuất/thu hồi refresh token, mật khẩu sai, email trùng, mất mạng và responsive.

- `npm test`: Đặt lịch đủ bốn bước trên 1440 / 768 / 390 / 320px, dữ liệu xác nhận và QR, in PDF, hủy lịch, đủ bốn vai trò, tìm kiếm/check-in, tiếp nhận vãng lai, chỉ định và trả kết quả, kê thuốc, hoàn tất khám, ba phương thức thu tiền, danh mục quản trị, modal mobile, trạng thái rỗng, ngày không hợp lệ và mất mạng.
- `test:visual`: Mười màn hình tại 1920 / 1440 / 1024 / 768 / 390 / 320px; kiểm tra lỗi runtime, tràn ngang toàn trang, ID trùng, ảnh hỏng và chữ bị cắt trong control; chụp từng màn hình.
- `test:a11y`: Axe WCAG 2 A/AA và 2.1 AA cho mười màn hình và hộp thoại kê thuốc tại desktop/mobile. Kiểm tra tự động không thay thế thử nghiệm với người dùng hay mọi trình đọc màn hình.

## Luồng thử thủ công

1. Trang chủ → **Đặt lịch khám ngay** → Nội khoa → chọn bác sĩ → chọn ngày/giờ, nhập lý do → xác nhận. Mở phiếu, in hoặc xem danh sách lịch hẹn.
2. Vào vai trò **Tiếp nhận** → nhập mã phiếu vừa tạo → **Check-in**. Thử tìm bệnh nhân và tiếp nhận người bệnh vãng lai bằng biểu mẫu.
3. Vào vai trò **Bác sĩ** → gọi bệnh nhân → bắt đầu khám → chỉnh sinh hiệu và chẩn đoán → thêm chỉ định, thuốc → hoàn tất khám.
4. Giao diện chuyển đến thu ngân. Thử chuyển Tiền mặt / Chuyển khoản / Thẻ POS, xem bảng kê và xác nhận thu tiền mô phỏng. **Không chuyển tiền thật.**
5. Vào vai trò **Quản trị** → kiểm tra Tổng quan, Bác sĩ, Dịch vụ, Kho thuốc.
6. Trên mobile: mở/đóng menu, dùng Escape, kiểm tra focus bằng Tab, nhập biểu mẫu và cuộn bảng theo chiều ngang. Trên máy tính: thử phóng to 200%.

## Phạm vi và giới hạn

Đây chưa phải xác nhận hệ thống đủ điều kiện vận hành y tế thực tế. Xác thực đã dùng API thật; lịch khám, phiếu khám, thu ngân và báo cáo vẫn lấy từ `MOCK_DATA`. Refresh trang sẽ khởi tạo lại các trạng thái nghiệp vụ demo, nhưng có thể khôi phục phiên đăng nhập trong cùng tab.

Các giới hạn nghiệp vụ đã có từ trước được giữ ngoài phạm vi thay đổi:

- Đơn thuốc và CLS nằm trong trạng thái dùng chung, chưa được lưu riêng theo từng bệnh nhân. Xóa hết CLS có thể kích hoạt lại dữ liệu mẫu.
- Thu ngân tính tiền thừa và VietQR theo hằng số 718.300 VNĐ, không luôn trùng tổng bảng kê. Xác nhận thu tiền vẫn là mô phỏng, không gọi API Invoice, không ghi giao dịch thật và không gửi tín hiệu nhà thuốc.
- Autosave cũ ghi localStorage nhưng chưa có quy trình khôi phục bản nháp đầy đủ. Lớp UI mới giữ nội dung đang nhập qua các lần render trong phiên hiện tại, không thay thế lưu hồ sơ trên server.
- Khung giờ được tạo ngẫu nhiên trong dữ liệu mẫu; lớp UI giữ ổn định hiển thị theo bác sĩ/ngày. Đây không phải thông tin lịch trống từ cơ sở khám.
- Chỉ số dashboard, lịch sử mẫu và một số thông tin tài khoản là dữ liệu minh họa. Nút thêm bác sĩ, dịch vụ và nhập kho vẫn chỉ thông báo như bản gốc, chưa có CRUD phía server.
- Phiếu hẹn có mã QR được tạo từ mã lịch hẹn và stylesheet in riêng. Bảng kê có thể in bằng trình duyệt; đây không phải hóa đơn điện tử có giá trị pháp lý.

Các mục trên cần một đợt tích hợp nghiệp vụ/API riêng trước khi dùng với người bệnh thật. Không được coi nhãn demo hoặc kiểm thử UI là bảo đảm tính toàn vẹn dữ liệu lâm sàng/thanh toán.

## Tài nguyên

- Ảnh tư vấn minh họa: [Pexels, ảnh 7579831](https://www.pexels.com/photo/7579831/), tải vào `assets/consultation.jpg`. Không phải ảnh bác sĩ trong danh mục demo. [Giấy phép Pexels](https://www.pexels.com/license/).
- Be Vietnam Pro: SIL Open Font License, kèm `assets/fonts/LICENSE`.
- Lucide: ISC, kèm `js/vendor/LUCIDE-LICENSE`.
- qrcode-generator: MIT; thông tin bản quyền nằm ở đầu `js/vendor/qrcode.js`.
