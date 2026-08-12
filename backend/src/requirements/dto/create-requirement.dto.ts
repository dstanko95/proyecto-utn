import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRequirementDto {
  @IsString()
  @IsNotEmpty({ message: 'El código del requerimiento es obligatorio (ej: RF01)' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID del proyecto es obligatorio' })
  projectId: string;

  @IsString()
  @IsOptional()
  initialMermaid?: string;

  @IsOptional()
  dependencies?: string[];

  @IsOptional()
  rules?: any[];
}
