import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ValidateContextDto } from './dto/validate-context.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(req.user.id, createProjectDto);
  }

  @Post('analyze-context')
  analyzeContext(@Body('contextMarkdown') contextMarkdown: string) {
    return this.projectsService.analyzeContext(contextMarkdown);
  }

  @Post(':id/validate-context')
  validateContext(
    @Request() req,
    @Param('id') id: string,
    @Body() validateDto: ValidateContextDto,
  ) {
    return this.projectsService.validateContext(id, req.user.id, validateDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.projectsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.projectsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.projectsService.remove(id, req.user.id);
  }
}
