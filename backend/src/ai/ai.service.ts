import { Injectable, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AnalyzeAiPayload {
  requirementText: string;
  projectContext?: Record<string, any>;
  userAnswers?: string[];
}

export interface LearnAiPayload {
  domain: string;
  patternType?: string;
  ruleStatement: string;
}

@Injectable()
export class AiService {
  private readonly aiServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
  }

  async analyzeContext(contextMarkdown: string): Promise<any> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/analyze-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contextMarkdown }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadGatewayException(`Error al analizar el contexto inicial: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      throw new BadGatewayException(`No se pudo comunicar con el servicio de IA para analizar el contexto inicial.`);
    }
  }

  async analyze(payload: AnalyzeAiPayload): Promise<any> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadGatewayException(`Error devuelto por el microservicio de IA: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      throw new BadGatewayException(`No se pudo establecer comunicación con el microservicio de IA en ${this.aiServiceUrl}`);
    }
  }

  async learn(payload: LearnAiPayload): Promise<any> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadGatewayException(`Error al persistir aprendizaje en el microservicio de IA: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      throw new BadGatewayException(`No se pudo comunicar con el servicio de IA para persistir el aprendizaje.`);
    }
  }
}
