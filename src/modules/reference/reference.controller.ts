import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { REFERENCE_SETS, REFERENCE_SET_NAMES, RefItem } from './reference.data';

@ApiTags('Reference')
@Controller('reference')
export class ReferenceController {
  @Get()
  @ApiOperation({ summary: 'List the available reference sets (public)' })
  list(): string[] {
    return REFERENCE_SET_NAMES;
  }

  @Get(':set')
  @ApiOperation({
    summary: 'Get a reference set as { code, label }[] (public)',
  })
  get(@Param('set') set: string): RefItem[] {
    const items = REFERENCE_SETS[set];
    if (!items) {
      throw new NotFoundException(
        `Unknown reference set '${set}'. Try one of: ${REFERENCE_SET_NAMES.join(', ')}`,
      );
    }
    return items;
  }
}
