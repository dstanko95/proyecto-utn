import { Module } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
