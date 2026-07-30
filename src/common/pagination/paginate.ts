import { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface Paginated<T> {
  results: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function applyPagination(q: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  return { skip: (q.page - 1) * q.limit, take: q.limit };
}

export function paginate<T>(
  results: T[],
  total: number,
  q: PaginationQueryDto,
): Paginated<T> {
  return {
    results,
    total,
    page: q.page,
    pageSize: q.limit,
    totalPages: Math.ceil(total / q.limit),
  };
}
