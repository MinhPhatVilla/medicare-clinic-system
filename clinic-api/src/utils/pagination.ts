/**
 * @file src/utils/pagination.ts
 * @description Utility phân trang cho các API list
 */

import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginationMeta } from './ApiResponse';

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Áp dụng phân trang lên TypeORM QueryBuilder
 * @example
 * const result = await paginate(queryBuilder, { page: 1, limit: 10 });
 * ApiResponse.success(res, result.data, 'OK', 200, result.meta);
 */
export async function paginate<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  { page = 1, limit = 10 }: PaginationQuery,
): Promise<PaginatedResult<T>> {
  const safeLimit = Math.min(Math.max(limit, 1), 100); // Giới hạn max 100 items/page
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const [data, total] = await queryBuilder.skip(offset).take(safeLimit).getManyAndCount();

  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}
