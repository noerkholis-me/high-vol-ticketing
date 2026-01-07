import { EventCreateInput } from '../../../generated/prisma/models';

export class CreateEventDto implements EventCreateInput {
  name: string;
  date: string | Date;
  description?: string | null | undefined;
  location: string;
}
