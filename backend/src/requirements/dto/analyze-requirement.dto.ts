import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class AnalyzeRequirementDto {
  @IsString()
  @IsNotEmpty({ message: 'El texto del requerimiento es obligatorio' })
  requirementText: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID del proyecto es obligatorio' })
  projectId: string;

  @IsArray()
  @IsOptional()
  userAnswers?: string[];
}
