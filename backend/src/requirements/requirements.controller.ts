import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { AnalyzeRequirementDto } from './dto/analyze-requirement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateRequirementDto) {
    return this.requirementsService.create(req.user.id, createDto);
  }

  @Post('analyze')
  analyze(@Request() req, @Body() analyzeDto: AnalyzeRequirementDto) {
    return this.requirementsService.analyze(req.user.id, analyzeDto);
  }

  @Post(':id/approve')
  approve(@Request() req, @Param('id') id: string) {
    return this.requirementsService.approve(id, req.user.id);
  }

  @Get('project/:projectId')
  findByProject(@Request() req, @Param('projectId') projectId: string) {
    return this.requirementsService.findByProject(projectId, req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.requirementsService.findOne(id, req.user.id);
  }

  @Post(':id/versions')
  addVersion(@Request() req, @Param('id') id: string, @Body() versionDto: CreateVersionDto) {
    return this.requirementsService.addVersion(id, req.user.id, versionDto);
  }

  @Patch(':id/status')
  updateStatus(@Request() req, @Param('id') id: string, @Body('status') status: string) {
    return this.requirementsService.updateStatus(id, req.user.id, status);
  }
}
