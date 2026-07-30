import { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function applyPagination(q: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  return { skip: (q.page - 1) * q.limit, take: q.limit };
}

export function buildMeta(total: number, q: PaginationQueryDto): PageMeta {
  return {
    total,
    page: q.page,
    limit: q.limit,
    totalPages: Math.ceil(total / q.limit),
  };
}

export function paginated<T>(
  data: T[],
  total: number,
  q: PaginationQueryDto,
): { data: T[]; meta: PageMeta } {
  return { data, meta: buildMeta(total, q) };
}
