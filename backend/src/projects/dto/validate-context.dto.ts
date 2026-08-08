import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class ValidateContextDto {
  @IsString()
  @IsNotEmpty({ message: 'El resumen del contexto es obligatorio' })
  contextSummary: string;

  @IsArray()
  @IsOptional()
  actors?: string[];
}
