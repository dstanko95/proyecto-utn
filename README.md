# ReqRefiner — Plataforma Agéntica para el Refinamiento Inteligente de Requerimientos de Software

ReqRefiner es una solución web empresarial y académica orientada al **refinamiento automatizado, interactivo y asistido por Inteligencia Artificial (IA)** de requerimientos de software redactados en lenguaje natural.

Diseñada bajo un enfoque de **orquestación multi-agente** con **LangGraph** y **búsqueda semántica (RAG) con pgvector**, la plataforma transforma textos imprecisos o incompletos en especificaciones técnicas de alto valor, incluyendo criterios de aceptación estructurados, diagramas de flujo/secuencia en **Mermaid.js**, detección de contradicciones y reglas de negocio persistentes.

---

## 🎯 Problema que Resuelve

En el desarrollo de software, la ambigüedad, la falta de contexto y la inconsistencia en la etapa de especificación de requerimientos representan una de las mayores fuentes de sobrecostos, re-trabajo y fallas en producción.

ReqRefiner soluciona esta problemática mediante:
1. **Detección Temprana de Ambigüedades**: Evalúa si el requerimiento ingresado por el usuario contiene suficiente información o si requiere aclaraciones interactivas antes de avanzar.
2. **Generación Automatizada de Especificaciones**: Produce automáticamente documentación técnica estandarizada (Historias de Usuario, Criterios de Aceptación, Diagramas Mermaid).
3. **Validación Lógica y de Consistencia**: Detecta reglas de negocio respecto al contexto global del proyecto.
4. **Memoria de Dominio Persistente (RAG)**: Aprende reglas de negocio transversales y patrones del dominio a medida que se aprueban nuevos requerimientos, evitando repetir inconsistencias pasadas.

---

## 🏗️ Arquitectura del Sistema

ReqRefiner está construido bajo una arquitectura de microservicios contenerizados y desacoplados:

### 1. Capa de Cliente (Frontend)
- **Tecnologías**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React.
- **Función**: Interfaz de usuario dinámica en formato panel/workspace con soporte para renderizado en tiempo real de diagramas Mermaid.js, edición interactiva de respuestas de aclaración, seguimiento del pipeline de agentes y visualización del grafo de trazabilidad.

### 2. Capa de Negocio (Backend API)
- **Tecnologías**: Node.js, NestJS, Prisma ORM, JWT Authentication.
- **Función**: Gestión de autenticación de usuarios, proyectos, requerimientos, versionado histórico, trazabilidad de dependencias entre requerimientos y puente REST con el microservicio de IA.

### 3. Capa de Inteligencia Artificial (AI Service)
- **Tecnologías**: Python 3.11, FastAPI, LangGraph, LangChain, Pydantic.
- **Función**: Microservicio agéntico que ejecuta el grafo de decisión multi-agente, consulta la memoria semántica, gestiona el fallback de modelos LLM y registra métricas de consumo de tokens y latencia.

### 4. Capa de Persistencia y Memoria Semántica (Database)
- **Tecnologías**: PostgreSQL 16 + extensión `pgvector`.
- **Función**: Almacenamiento relacional de entidades del sistema (Usuarios, Proyectos, Requerimientos, Versiones, Reglas) y almacenamiento vectorial de embeddings de patrones y reglas aprendidas del dominio.

### 5. Proveedores de Modelos de Lenguaje (LLM Engines)
- **Proveedor Principal**: Google Gemini API (3.5 Flash Lite).
- **Proveedor Local / Fallback**: Ollama (Qwen 2.5) para entornos locales o sin conectividad externa.

---

## 🤖 Sistema Multi-Agente (Orquestación LangGraph)

El microservicio de IA orquesta cinco agentes especializados que interactúan secuencial y condicionalmente:

1. **Agente Analizador (Analyzer Agent)**
   - Extrae el contexto inicial del proyecto, dominio de negocio, actores principales y alcance funcional.
   - Genera embeddings del requerimiento e interactúa con `pgvector` para recuperar reglas de negocio previas mediante RAG.

2. **Agente Planificador (Planner Agent)**
   - Revisa la completitud del requerimiento.
   - Si detecta vacíos o ambigüedades, detiene el flujo para formular preguntas de aclaración interactivas al analista.

3. **Agente Generador (Generator Agent)**
   - Sintetiza la información refinada y genera:
     - Título y código normalizado del requerimiento (ej: `RF-001`).
     - Descripción técnica detallada en Markdown.
     - Criterios de aceptación estructurados en lenguaje natural.
     - Diagramas de flujo o secuencia en código **Mermaid.js**.
     - Lista de reglas de negocio explícitas e implícitas.

4. **Agente Evaluador (Evaluator Agent)**
   - Revisa la calidad técnica del resultado generado.
   - Comprueba coherencia entre la descripción, el diagrama y los escenarios de aceptación, verificando que no existan contradicciones o entidades huérfanas.

5. **Agente de Aprendizaje (Learning Agent)**
   - Una vez aprobado el requerimiento, extrae nuevas reglas y patrones de negocio transversales y los indexa vectorialmente en `pgvector` para enriquecer futuros análisis.

---

## 🛠️ Stack Tecnológico

| Capa / Componente | Tecnología Utilizada |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Mermaid.js |
| **Backend API** | Node.js, NestJS, Prisma ORM, JWT, Passport.js |
| **AI Microservice** | Python 3.11, FastAPI, LangGraph, LangChain, Pydantic |
| **Persistencia Vectorial & SQL** | PostgreSQL 16 con extensión `pgvector` |
| **Modelos LLM** | Google Gemini (API cloud) + Ollama (LLM Local) |
| **Infraestructura y Contenerización** | Docker, Docker Compose |

---

## 🌟 Funcionalidades Principales

- 🔐 **Autenticación y Gestión de Usuarios**: Registro, inicio de sesión seguro con JWT y aislamiento de proyectos por usuario.
- 📁 **Gestión de Proyectos y Contexto Inicial**: Definición de objetivos, alcance, actores y restricciones generales que alimentan el contexto de refinamiento.
- 📝 **Entrada de Requerimientos en Lenguaje Natural**: Interfaz tipo borrador donde los usuarios ingresan ideas, notas o especificaciones preliminares.
- 🔄 **Refinamiento Interactivo (Loop de Preguntas y Respuestas)**: El sistema interroga al usuario cuando falta contexto crítico antes de generar la versión final.
- 📊 **Visualización de Diagramas y Criterios de Aceptación**: Generación instantánea de diagramas interactivos y escenarios estructurados listos para pruebas automatizadas.
- 📜 **Historial de Versiones e Inmutabilidad**: Control de versiones de cada requerimiento refinado, permitiendo auditar cambios y evolución.

---

## 📁 Estructura del Proyecto

```text
proyecto-utn/
├── ai-service/                # Microservicio en Python (FastAPI + LangGraph + pgvector)
│   ├── app/
│   │   ├── agents/            # Agentes IA (Analyzer, Planner, Generator, Evaluator, Learning)
│   │   ├── vectorstore/       # Integración con pgvector / RAG
│   │   ├── graph.py           # Definición del flujo de trabajo LangGraph
│   │   ├── llm_provider.py    # Abstracción e integración Gemini / Ollama
│   │   ├── token_logger.py    # Registro de uso de tokens y latencia
│   │   └── main.py            # Endpoints FastAPI
│   └── Dockerfile
├── backend/                   # API REST en Node.js / NestJS
│   ├── prisma/                # Esquema de base de datos y migraciones (schema.prisma)
│   ├── src/
│   │   ├── auth/              # Módulo de Autenticación JWT
│   │   ├── projects/          # Módulo de Gestión de Proyectos y Contexto
│   │   ├── requirements/      # Módulo de Requerimientos y Versionado
│   │   └── ai/                # Cliente HTTP para comunicación con ai-service
│   └── Dockerfile
├── frontend/                  # Aplicación Web SPA en React + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # Componentes UI (Sidebar, Header, Footer, etc.)
│   │   ├── views/             # Vistas de la app (Dashboard, Entrada, Procesamiento, Salida, Grafo)
│   │   ├── api.ts             # Cliente de API REST
│   │   └── App.tsx            # Contenedor principal y enrutamiento
│   └── Dockerfile
├── docker-compose.yml         # Orquestador Docker para todos los servicios
├── .env.example               # Plantilla de variables de entorno globales
└── README.md                  # Documentación principal del proyecto
```

---

## 🚀 Guía de Instalación y Despliegue

### Prerrequisitos

- **Docker Desktop** (versión 20.10 o superior) y **Docker Compose**.
- **Clave API de Google Gemini** (opcional si se utiliza únicamente Ollama de forma local).

---

### Opción 1: Ejecución Rápida con Docker (Recomendada)

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/dstanko95/proyecto-utn.git
   cd proyecto-utn
   ```

2. **Configurar las variables de entorno:**
   Copia las plantillas `.env.example` en la raíz y en cada subdirectorio:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp ai-service/.env.example ai-service/.env
   ```

   Edita el archivo `.env` principal ubicado en la raíz del proyecto para incluir tu clave de Google Gemini y configurar el uso de la API:
   ```env
   GOOGLE_API_KEY=tu_clave_api_aqui
   DISABLE_GEMINI=false
   ```

3. **Construir y levantar los contenedores:**
   ```bash
   docker-compose up --build
   ```

4. **Acceder a los servicios:**
   - **Aplicación Frontend**: [http://localhost](http://localhost) (o [http://localhost:80](http://localhost:80))
   - **Backend API REST**: [http://localhost:3000](http://localhost:3000)
   - **AI Service Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Opción 2: Ejecución Manual en Entorno de Desarrollo Local

Si deseas ejecutar y modificar cada servicio de manera independiente sin Docker:

#### 1. Base de Datos (PostgreSQL + pgvector)
Asegúrate de contar con una instancia local de PostgreSQL 16 con la extensión `pgvector` instalada y crea la base de datos `reqrefiner_db`.

#### 2. Backend API (NestJS)
```bash
cd backend
npm install
npx prisma db push
npm run start:dev
```
La API quedará escuchando en `http://localhost:3000`.

#### 3. AI Service (Python / FastAPI)
```bash
cd ai-service
python -m venv venv
# En Windows:
venv\Scripts\activate
# En Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
El servicio estará disponible en `http://localhost:8000`.

#### 4. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Accede a la URL indicada por Vite (habitualmente `http://localhost:5173`).

---

## ⚙️ Variables de Entorno Principales

| Archivo / Servicio | Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- | :--- |
| **Raíz / global** | `POSTGRES_USER` | Usuario de PostgreSQL | `postgres` |
| **Raíz / global** | `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| **Raíz / global** | `POSTGRES_DB` | Nombre de la base de datos | `reqrefiner_db` |
| **Raíz / global** | `GOOGLE_API_KEY` | Clave API para modelos Google Gemini | *(Requerido para Gemini)* |
| **Raíz / global** | `DISABLE_GEMINI` | Deshabilita Gemini (`true`) para usar el modelo local o usa API (`false`) | `false` |
| **ai-service** | `MODEL_NAME` | Modelo Gemini preferido | `gemini-3.5-flash-lite` |
| **ai-service** | `OLLAMA_BASE_URL` | URL base del servidor Ollama local | `http://ollama:11434` |
| **ai-service** | `OLLAMA_MODEL` | Nombre del modelo LLM local | `qwen2.5:7b` |
| **backend** | `JWT_SECRET` | Clave secreta para firmar tokens JWT | `reqrefiner_super_secret_jwt_key` |
| **backend** | `AI_SERVICE_URL` | Endpoint del microservicio agéntico | `http://ai-service:8000` |

---

## 📄 Licencia y Contexto Institucional

- **Institución**: Universidad Tecnológica Nacional — Facultad Regional Buenos Aires (UTN FRBA)
- **Programa**: Inteligencia Artificial Aplicada a Organizaciones
- **Trabajo de Fin de Ciclo / Proyecto Integrador**
- **Autor**: Diego Stanko
- **Año**: 2026
