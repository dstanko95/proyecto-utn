import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de versión es obligatorio (ej: v1.1)' })
  versionNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'El contenido Markdown es obligatorio' })
  contentMarkdown: string;

  @IsString()
  @IsOptional()
  mermaidDiagram?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del autor o agente es obligatorio' })
  authorName: string;

  @IsString()
  @IsNotEmpty({ message: 'El registro de cambios es obligatorio' })
  changeLog: string;
}
