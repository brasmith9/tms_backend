import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { applyPagination, buildMeta, paginated } from './paginate';

const q = (page: number, limit: number): PaginationQueryDto =>
  Object.assign(new PaginationQueryDto(), { page, limit });

describe('pagination helpers', () => {
  it('computes skip/take from page and limit', () => {
    expect(applyPagination(q(3, 20))).toEqual({ skip: 40, take: 20 });
  });

  it('builds meta with a ceil on totalPages', () => {
    expect(buildMeta(45, q(1, 20))).toEqual({
      total: 45,
      page: 1,
      limit: 20,
      totalPages: 3,
    });
  });

  it('wraps data and meta together', () => {
    const res = paginated(['a', 'b'], 2, q(1, 20));
    expect(res).toEqual({
      data: ['a', 'b'],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
  });
});
