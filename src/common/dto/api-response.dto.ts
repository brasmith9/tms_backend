import {
  ApiExtraModels,
  ApiProperty,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';
import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

/** Swagger model for the paginated `data` payload. */
export class PaginatedDataDto<T> {
  @ApiProperty({ isArray: true }) results!: T[];
  @ApiProperty({ example: 45 }) total!: number;
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) pageSize!: number;
  @ApiProperty({ example: 3 }) totalPages!: number;
}

/**
 * Documents a single-resource endpoint's envelope:
 * `{ code, message, data: <model> }`.
 */
export function ApiEnvelopeResponse<TModel extends Type<unknown>>(
  model: TModel,
  options?: ApiResponseOptions,
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      ...options,
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: 200 },
          message: { type: 'string', example: 'OK' },
          data: { $ref: getSchemaPath(model) },
        },
      },
    }),
  );
}

/**
 * Documents a list endpoint's envelope:
 * `{ code, message, data: { results: <model>[], total, page, pageSize, totalPages } }`.
 */
export function ApiPaginatedResponse<TModel extends Type<unknown>>(
  model: TModel,
  options?: ApiResponseOptions,
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      ...options,
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: 200 },
          message: { type: 'string', example: 'OK' },
          data: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              total: { type: 'number', example: 45 },
              page: { type: 'number', example: 1 },
              pageSize: { type: 'number', example: 20 },
              totalPages: { type: 'number', example: 3 },
            },
          },
        },
      },
    }),
  );
}
