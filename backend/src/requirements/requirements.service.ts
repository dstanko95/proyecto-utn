import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { AnalyzeRequirementDto } from './dto/analyze-requirement.dto';

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(userId: string, createDto: CreateRequirementDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: createDto.projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado o sin acceso');
    }

    return this.prisma.requirement.create({
      data: {
        code: createDto.code,
        title: createDto.title,
        description: createDto.description,
        projectId: createDto.projectId,
        status: 'DRAFT',
        versions: {
          create: {
            versionNumber: 'v1.0',
            contentMarkdown: createDto.description,
            mermaidDiagram: createDto.initialMermaid,
            authorName: 'Usuario',
            changeLog: 'Carga inicial del requerimiento',
          },
        },
      },
      include: {
        versions: true,
      },
    });
  }

  async analyze(userId: string, analyzeDto: AnalyzeRequirementDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: analyzeDto.projectId, userId },
      include: { actors: true }
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado o sin acceso');
    }

    let domain = 'General';
    if (project.contextSummary) {
      try {
        const parsed = typeof project.contextSummary === 'string' ? JSON.parse(project.contextSummary) : project.contextSummary;
        if (parsed && parsed.detected_domain) {
          domain = parsed.detected_domain;
        }
      } catch (e) {}
    }

    const existingCount = await this.prisma.requirement.count({
      where: { projectId: analyzeDto.projectId },
    });

    const nextNumber = existingCount + 1;
    const requirementCode = `RF${String(nextNumber).padStart(2, '0')}`;
    const versionNumber = '1.0';

    const projectContext = {
      name: project.name,
      generalObjective: project.generalObjective,
      scope: project.scope,
      initialContextMarkdown: project.initialContextMarkdown,
      contextSummary: project.contextSummary,
      actors: project.actors.map(a => a.name),
      domain: domain,
      requirementCode,
      versionNumber,
      existingCount,
    };

    const aiResponse = await this.aiService.analyze({
      requirementText: analyzeDto.requirementText,
      projectContext,
      userAnswers: analyzeDto.userAnswers,
    });

    return aiResponse;
  }

  async approve(id: string, userId: string) {
    const requirement = await this.findOne(id, userId);

    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        project: true,
        businessRules: true
      }
    });

    let domain = 'General';
    if (updated.project && updated.project.contextSummary) {
      try {
        const parsed = typeof updated.project.contextSummary === 'string' ? JSON.parse(updated.project.contextSummary) : updated.project.contextSummary;
        if (parsed && parsed.detected_domain) {
          domain = parsed.detected_domain;
        }
      } catch (e) {}
    }

    for (const rule of updated.businessRules) {
      await this.aiService.learn({
        domain: domain,
        patternType: 'RULE',
        ruleStatement: rule.statement
      });
    }

    return {
      message: 'Requerimiento aprobado e incorporado a la memoria persistente',
      requirement: updated
    };
  }

  async updateStatus(id: string, userId: string, status: string) {
    await this.findOne(id, userId);
    return this.prisma.requirement.update({
      where: { id },
      data: { status }
    });
  }

  async findByProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado o sin acceso');
    }

    return this.prisma.requirement.findMany({
      where: { projectId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' }
        },
        businessRules: true,
        _count: {
          select: { sourceDependencies: true, targetDependencies: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, userId: string) {
    const requirement = await this.prisma.requirement.findFirst({
      where: { id },
      include: {
        project: true,
        versions: {
          orderBy: { createdAt: 'desc' }
        },
        businessRules: true,
        sourceDependencies: {
          include: { targetReq: true }
        },
        targetDependencies: {
          include: { sourceReq: true }
        }
      }
    });

    if (!requirement || requirement.project.userId !== userId) {
      throw new NotFoundException('Requerimiento no encontrado o sin acceso');
    }

    return requirement;
  }

  async addVersion(id: string, userId: string, versionDto: CreateVersionDto) {
    await this.findOne(id, userId);

    return this.prisma.requirementVersion.create({
      data: {
        requirementId: id,
        versionNumber: versionDto.versionNumber,
        contentMarkdown: versionDto.contentMarkdown,
        mermaidDiagram: versionDto.mermaidDiagram,
        authorName: versionDto.authorName || 'Usuario',
        changeLog: versionDto.changeLog || 'Nueva versión agregada',
      },
    });
  }
}
