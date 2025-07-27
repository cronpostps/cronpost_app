// Cấu hình địa chỉ gốc cho API backend.
// Vì bạn đang sử dụng Cloudflare Tunnel, chúng ta sẽ dùng tên miền công khai.
// Axios client sẽ tự động thêm '/api/...' vào sau URL này.
export const API_BASE_URL = 'https://cronpost.com';
