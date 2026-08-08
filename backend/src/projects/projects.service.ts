import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ValidateContextDto } from './dto/validate-context.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    const { name, generalObjective, scope, initialContextMarkdown, actors } = createProjectDto;

    return this.prisma.project.create({
      data: {
        name,
        generalObjective: generalObjective || 'Objetivo de gestión de requerimientos',
        scope: scope || 'Alcance funcional del proyecto',
        initialContextMarkdown: initialContextMarkdown || null,
        status: 'DRAFT_CONTEXT',
        userId,
        actors: actors && actors.length > 0 ? {
          create: actors.map(a => ({ name: a.name, description: a.description }))
        } : undefined,
      },
      include: {
        actors: true,
      },
    });
  }

  async analyzeContext(contextMarkdown: string) {
    return this.aiService.analyzeContext(contextMarkdown);
  }

  async validateContext(id: string, userId: string, dto: ValidateContextDto) {
    const project = await this.findOne(id, userId);

    const { contextSummary, actors } = dto;

    // Update project with contextSummary and set status CONTEXT_VALIDATED
    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        contextSummary,
        status: 'CONTEXT_VALIDATED',
        actors: actors && actors.length > 0 ? {
          deleteMany: {},
          create: actors.map(name => ({ name }))
        } : undefined,
      },
      include: {
        actors: true,
      },
    });

    return updated;
  }

  async findAllByUser(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        actors: true,
        _count: {
          select: { requirements: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        actors: true,
        requirements: {
          include: {
            versions: {
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            businessRules: true
          }
        }
      }
    });

    if (!project) {
      throw new NotFoundException(`Proyecto no encontrado o sin acceso`);
    }

    return project;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.project.delete({
      where: { id },
    });
  }
}
