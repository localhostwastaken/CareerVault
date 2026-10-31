import { Matches } from 'class-validator';
import { FORMATS } from '../../../common/validators/formats.js';

export class MockCompleteDto {
  @Matches(FORMATS.mockSessionId, { message: 'Unknown checkout session' })
  sessionId!: string;
}
