import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { RequirementsModule } from './requirements/requirements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AiModule,
    AuthModule,
    ProjectsModule,
    RequirementsModule,
  ],
})
export class AppModule {}
