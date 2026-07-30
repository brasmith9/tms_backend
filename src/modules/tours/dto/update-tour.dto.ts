import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTourDto } from './create-tour.dto';

/** Everything on CreateTourDto except destinationId is editable while drafting. */
export class UpdateTourDto extends PartialType(
  OmitType(CreateTourDto, ['destinationId'] as const),
) {}
