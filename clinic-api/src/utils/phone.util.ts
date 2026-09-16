/**
 * @file src/utils/phone.util.ts
 * @description Utility chuẩn hóa và kiểm tra số điện thoại Việt Nam
 */

import { BadRequestError } from '../exceptions/AppError';

// Regex kiểm tra số điện thoại di động Việt Nam chuẩn: 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09
export const VN_PHONE_REGEX = /^0(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;

/**
 * Chuẩn hóa số điện thoại về định dạng chuẩn 10 chữ số (VD: "0912345678")
 * - Loại bỏ khoảng trắng, dấu chấm, dấu gạch nối, dấu ngoặc
 * - Chuyển đổi đầu số quốc tế "+84" hoặc "84" về đầu số "0"
 * - Kiểm tra tính hợp lệ theo quy định nhà mạng Việt Nam
 */
export const normalizePhoneNumber = (rawPhone: string): string => {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new BadRequestError('Số điện thoại không được để trống');
  }

  // Loại bỏ các ký tự phân cách thông thường: space, ., -, (, )
  let cleaned = rawPhone.trim().replace(/[\s.\-()]/g, '');

  // Xử lý đầu số quốc tế +84 hoặc 84
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Kiểm tra định dạng số điện thoại
  if (!VN_PHONE_REGEX.test(cleaned)) {
    throw new BadRequestError(
      `Số điện thoại "${rawPhone}" không hợp lệ. Vui lòng nhập số điện thoại di động Việt Nam 10 chữ số (đầu số 03, 05, 07, 08, 09).`,
    );
  }

  return cleaned;
};

/**
 * Kiểm tra xem chuỗi có phải số điện thoại hợp lệ không (không throw error)
 */
export const isValidPhoneNumber = (rawPhone: string): boolean => {
  try {
    normalizePhoneNumber(rawPhone);
    return true;
  } catch {
    return false;
  }
};
