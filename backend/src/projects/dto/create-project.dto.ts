import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proyecto es obligatorio' })
  name: string;

  @IsString()
  @IsOptional()
  generalObjective?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  initialContextMarkdown?: string;

  @IsArray()
  @IsOptional()
  actors?: { name: string; description?: string }[];
}
