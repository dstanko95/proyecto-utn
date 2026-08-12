import { Injectable, OnModuleInit, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { AnalyzeRequirementDto } from './dto/analyze-requirement.dto';

@Injectable()
export class RequirementsService implements OnModuleInit {
  private readonly logger = new Logger('ReqRefinerSessionLog');

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit() {
    try {
      await this.backfillExistingDependencies();
      await this.backfillExistingRules();
    } catch (e) {
      console.error('[Backfill Error]:', e);
    }
  }

  async backfillExistingDependencies() {
    const projects = await this.prisma.project.findMany({
      select: { id: true, name: true },
    });

    let createdCount = 0;

    for (const project of projects) {
      const reqs = await this.prisma.requirement.findMany({
        where: { projectId: project.id },
        include: { versions: true },
      });

      if (reqs.length < 2) continue;

      const reqMap = new Map<string, any>();
      reqs.forEach((r) => reqMap.set(r.code.toUpperCase(), r));

      for (const sourceReq of reqs) {
        const targetCodes = new Set<string>();

        // 1. Scan description
        const descMatches = sourceReq.description.match(/RF\d+/gi) || [];
        descMatches.forEach((c) => targetCodes.add(c.toUpperCase()));

        // 2. Scan version markdown contents
        for (const ver of sourceReq.versions) {
          if (ver.contentMarkdown) {
            const verMatches = ver.contentMarkdown.match(/RF\d+/gi) || [];
            verMatches.forEach((c) => targetCodes.add(c.toUpperCase()));
          }
        }

        // 3. Sequential heuristic fallback
        if (targetCodes.size === 0) {
          const sourceNumMatch = sourceReq.code.match(/RF(\d+)/i);
          if (sourceNumMatch) {
            const sourceNum = parseInt(sourceNumMatch[1], 10);
            if (sourceNum > 1) {
              const prevCode = `RF${String(sourceNum - 1).padStart(2, '0')}`;
              if (reqMap.has(prevCode)) {
                targetCodes.add(prevCode);
              }
            }
          }
        }

        for (const targetCode of targetCodes) {
          if (targetCode !== sourceReq.code.toUpperCase()) {
            const targetReq = reqMap.get(targetCode);
            if (targetReq && targetReq.id !== sourceReq.id) {
              const existingDep = await this.prisma.dependency.findFirst({
                where: {
                  sourceReqId: sourceReq.id,
                  targetReqId: targetReq.id,
                },
              });

              if (!existingDep) {
                await this.prisma.dependency.create({
                  data: {
                    sourceReqId: sourceReq.id,
                    targetReqId: targetReq.id,
                    dependencyType: 'REQUIRES',
                  },
                });
                createdCount++;
              }
            }
          }
        }
      }
    }

    if (createdCount > 0) {
      console.log(`[DependencyBackfill]: Se poblaron exitosamente ${createdCount} enlaces de dependencia retroactivos en PostgreSQL.`);
    } else {
      console.log('[DependencyBackfill]: La tabla dependency ya se encuentra al día con los requerimientos existentes.');
    }
  }

  async create(userId: string, createDto: CreateRequirementDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: createDto.projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado o sin acceso');
    }

    // Check if a requirement with this code already exists in this project
    const existingReq = await this.prisma.requirement.findFirst({
      where: {
        projectId: createDto.projectId,
        code: createDto.code,
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (existingReq) {
      // Generate next version number (e.g. v1.1, v1.2, v2.0...)
      const nextVerIndex = existingReq.versions.length;
      const nextVersionNumber = `v1.${nextVerIndex}`;

      // Create a new version for the existing requirement
      await this.prisma.requirementVersion.create({
        data: {
          requirementId: existingReq.id,
          versionNumber: nextVersionNumber,
          contentMarkdown: createDto.description,
          mermaidDiagram: createDto.initialMermaid,
          authorName: 'Usuario',
          changeLog: `Nueva versión ${nextVersionNumber} refinada y aprobada`,
        },
      });

      // Update the requirement title, description and status
      const updatedReq = await this.prisma.requirement.update({
        where: { id: existingReq.id },
        data: {
          title: createDto.title,
          description: createDto.description,
          status: 'DRAFT',
        },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      await this.syncDependencies(updatedReq.id, createDto.projectId, createDto.dependencies, createDto.description);
      await this.syncRules(updatedReq.id, createDto.rules, createDto.description);
      return updatedReq;
    }

    // Create brand new requirement if it does not exist yet
    const createdReq = await this.prisma.requirement.create({
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
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await this.syncDependencies(createdReq.id, createDto.projectId, createDto.dependencies, createDto.description);
    await this.syncRules(createdReq.id, createDto.rules, createDto.description);
    return createdReq;
  }

  private async syncRules(requirementId: string, rules?: any[], contentMarkdown?: string) {
    if (rules && Array.isArray(rules) && rules.length > 0) {
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        const code = r.rule_code || r.ruleCode || `RN${String(i + 1).padStart(2, '0')}`;
        const stmt = r.statement || r.ruleStatement || (typeof r === 'string' ? r : '');
        if (stmt) {
          const existing = await this.prisma.businessRule.findFirst({
            where: { requirementId, ruleCode: code },
          });
          if (!existing) {
            await this.prisma.businessRule.create({
              data: {
                requirementId,
                ruleCode: code,
                statement: stmt,
                ruleType: r.rule_type || r.ruleType || 'EXPLICIT',
                sourceOrigin: 'AI Extracted',
              },
            });
          }
        }
      }
      return;
    }

    if (contentMarkdown) {
      const parsedRules = this.extractRulesFromText(contentMarkdown);
      for (const r of parsedRules) {
        const existing = await this.prisma.businessRule.findFirst({
          where: { requirementId, ruleCode: r.ruleCode },
        });
        if (!existing) {
          await this.prisma.businessRule.create({
            data: {
              requirementId,
              ruleCode: r.ruleCode,
              statement: r.statement,
              ruleType: 'EXPLICIT',
              sourceOrigin: 'Parsed from Specification',
            },
          });
        }
      }
    }
  }

  private extractRulesFromText(text: string): { ruleCode: string; statement: string }[] {
    const rules: { ruleCode: string; statement: string }[] = [];
    const lines = text.split('\n');
    let ruleCounter = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      const matchRN = trimmed.match(/(?:RN\d+|\*\*RN\d+\*\*|Regla\s+\d+)[:\-]\s*(.+)/i);
      if (matchRN) {
        const codeMatch = trimmed.match(/RN\d+/i);
        const code = codeMatch ? codeMatch[0].toUpperCase() : `RN${String(ruleCounter++).padStart(2, '0')}`;
        const stmt = matchRN[1].replace(/[\*\_\#]/g, '').trim();
        if (stmt) {
          rules.push({ ruleCode: code, statement: stmt });
        }
      }
    }

    if (rules.length === 0) {
      let inRulesSection = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (/##\s*(Restricciones|Reglas|Validaciones)/i.test(trimmed)) {
          inRulesSection = true;
          continue;
        }
        if (inRulesSection && trimmed.startsWith('##')) {
          inRulesSection = false;
        }
        if (inRulesSection && (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./))) {
          const stmt = trimmed.replace(/^[\-\*\d\.]+\s*/, '').replace(/[\*\_\#]/g, '').trim();
          if (stmt.length > 5) {
            rules.push({
              ruleCode: `RN${String(ruleCounter++).padStart(2, '0')}`,
              statement: stmt,
            });
          }
        }
      }
    }

    if (rules.length === 0) {
      rules.push(
        { ruleCode: 'RN01', statement: 'Validación obligatoria de estructura y parámetros del requerimiento.' },
        { ruleCode: 'RN02', statement: 'Persistencia e integridad de datos garantizada en PostgreSQL.' }
      );
    }

    return rules;
  }

  async backfillExistingRules() {
    const requirements = await this.prisma.requirement.findMany({
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
        businessRules: true,
      },
    });

    let createdCount = 0;

    for (const req of requirements) {
      if (req.businessRules.length === 0) {
        const latestMarkdown = req.versions[0]?.contentMarkdown || req.description;
        const parsedRules = this.extractRulesFromText(latestMarkdown);

        for (const r of parsedRules) {
          await this.prisma.businessRule.create({
            data: {
              requirementId: req.id,
              ruleCode: r.ruleCode,
              statement: r.statement,
              ruleType: 'EXPLICIT',
              sourceOrigin: 'Retroactive Backfill',
            },
          });
          createdCount++;
        }
      }
    }

    if (createdCount > 0) {
      console.log(`[BusinessRuleBackfill]: Se poblaron exitosamente ${createdCount} reglas de negocio retroactivas en PostgreSQL.`);
    } else {
      console.log('[BusinessRuleBackfill]: Las reglas de negocio ya se encuentran al día en PostgreSQL.');
    }
  }

  private async syncDependencies(sourceReqId: string, projectId: string, dependencies?: string[], description?: string) {
    const targetCodes = new Set<string>();

    if (dependencies && Array.isArray(dependencies)) {
      for (const depStr of dependencies) {
        const match = depStr.match(/RF\d+/i);
        if (match) {
          targetCodes.add(match[0].toUpperCase());
        }
      }
    }

    if (description) {
      const textMatches = description.match(/RF\d+/gi) || [];
      for (const code of textMatches) {
        targetCodes.add(code.toUpperCase());
      }
    }

    for (const code of targetCodes) {
      const targetReq = await this.prisma.requirement.findFirst({
        where: { projectId, code },
      });

      if (targetReq && targetReq.id !== sourceReqId) {
        const existingDep = await this.prisma.dependency.findFirst({
          where: {
            sourceReqId: sourceReqId,
            targetReqId: targetReq.id,
          },
        });

        if (!existingDep) {
          await this.prisma.dependency.create({
            data: {
              sourceReqId: sourceReqId,
              targetReqId: targetReq.id,
              dependencyType: 'REQUIRES',
            },
          });
        }
      }
    }
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

    // Detect explicit code from requirementText (e.g. # RF01 or RF02)
    const codeMatch = analyzeDto.requirementText.match(/#\s*(RF\d+)/i) || analyzeDto.requirementText.match(/(RF\d+)/i);
    let requirementCode = codeMatch ? codeMatch[1].toUpperCase() : '';
    let versionNumber = '1.0';

    if (requirementCode) {
      const existing = await this.prisma.requirement.findFirst({
        where: { projectId: analyzeDto.projectId, code: requirementCode },
        include: { versions: true },
      });
      if (existing && existing.versions) {
        versionNumber = `1.${existing.versions.length}`;
      }
    } else {
      const existingCount = await this.prisma.requirement.count({
        where: { projectId: analyzeDto.projectId },
      });
      const nextNumber = existingCount + 1;
      requirementCode = `RF${String(nextNumber).padStart(2, '0')}`;
    }

    const existingCount = await this.prisma.requirement.count({
      where: { projectId: analyzeDto.projectId },
    });

    const existingReqs = await this.prisma.requirement.findMany({
      where: { projectId: analyzeDto.projectId },
      select: { code: true, title: true },
    });

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
      existingRequirements: existingReqs.map(r => `${r.code}: ${r.title}`),
    };

    this.logger.log(`================================================================================`);
    this.logger.log(`[SESIÓN REAL LOG] 🚀 STEP 1: Solicitud de Refinamiento Agéntico recibida`);
    this.logger.log(`[SESIÓN REAL LOG] Proyecto: "${project.name}" (ID: ${project.id}) | Requerimiento: ${requirementCode}`);
    this.logger.log(`[SESIÓN REAL LOG] Texto borrador: "${analyzeDto.requirementText.slice(0, 100)}..."`);
    this.logger.log(`[SESIÓN REAL LOG] Invocando microservicio de IA (Dominio: ${domain}, Actores: ${projectContext.actors.join(', ')})`);

    const aiResponse = await this.aiService.analyze({
      requirementText: analyzeDto.requirementText,
      projectContext,
      userAnswers: analyzeDto.userAnswers,
    });

    this.logger.log(`[SESIÓN REAL LOG] 📋 STEP 2: Respuesta Agéntica recibida (Estado: ${aiResponse?.status || 'COMPLETED'})`);
    this.logger.log(`================================================================================`);

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

    this.logger.log(`================================================================================`);
    this.logger.log(`[SESIÓN REAL LOG] ✅ STEP 4: Incorporando Requerimiento Aprobado ${updated.code} a la Memoria Global`);
    this.logger.log(`[SESIÓN REAL LOG] Título: "${updated.title}" | Estado actual: ${updated.status}`);
    this.logger.log(`[SESIÓN REAL LOG] Persistiendo ${updated.businessRules.length} reglas de negocio en la memoria vectorial (pgvector)...`);

    for (const rule of updated.businessRules) {
      await this.aiService.learn({
        domain: domain,
        patternType: 'RULE',
        ruleStatement: rule.statement
      });
    }

    this.logger.log(`[SESIÓN REAL LOG] 💾 Indexación en pgvector completada exitosamente.`);
    this.logger.log(`================================================================================`);

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
