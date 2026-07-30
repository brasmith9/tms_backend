import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { applyPagination, paginate } from './paginate';

const q = (page: number, limit: number): PaginationQueryDto =>
  Object.assign(new PaginationQueryDto(), { page, limit });

describe('pagination helpers', () => {
  it('computes skip/take from page and limit', () => {
    expect(applyPagination(q(3, 20))).toEqual({ skip: 40, take: 20 });
  });

  it('builds a paginated result with results, total and pageSize', () => {
    expect(paginate(['a', 'b'], 45, q(1, 20))).toEqual({
      results: ['a', 'b'],
      total: 45,
      page: 1,
      pageSize: 20,
      totalPages: 3,
    });
  });
});
