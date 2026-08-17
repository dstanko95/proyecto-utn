import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardView } from './views/DashboardView';
import EntradaView from './views/EntradaView';
import ProcesamientoView from './views/ProcesamientoView';
import SalidaView from './views/SalidaView';
import AprobadosView from './views/AprobadosView';
import GrafoView from './views/GrafoView';
import AuthView from './views/AuthView';
import ContextValidationModal from './views/ContextValidationModal';
import { api } from './api';
import type { UserProfile } from './api';
import { FolderKanban } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'entrada' | 'procesamiento' | 'salida' | 'aprobados' | 'grafo'>('dashboard');
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [requirementText, setRequirementText] = useState<string>('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function initAuth() {
      try {
        const user = await api.checkAuth();
        if (user) {
          setCurrentUser(user);
          await loadUserProjects();
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error verificando la autenticación:', error);
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    initAuth();
  }, []);

  const loadUserProjects = async () => {
    try {
      const projectList = await api.getProjects();
      if (projectList && projectList.length > 0) {
        setProjects(projectList);
        setActiveProject(projectList[0]);
      } else {
        setProjects([]);
        setActiveProject(null);
      }
    } catch (error) {
      console.error('Error cargando proyectos del usuario:', error);
      setProjects([]);
      setActiveProject(null);
    }
  };

  const handleAuthSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    setIsCheckingAuth(true);
    await loadUserProjects();
    setIsCheckingAuth(false);
    setCurrentView('dashboard');
  };

  const resetPhaseState = () => {
    setRequirementText('');
    setAiAnalysisResult(null);
    setIsApprovedRequirement(false);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setProjects([]);
    setActiveProject(null);
    resetPhaseState();
    setCurrentView('dashboard');
  };

  const handleSelectProjectName = (projName: string) => {
    const found = projects.find((p) => (p.name || p) === projName);
    if (found) {
      setActiveProject(found);
      resetPhaseState();
    }
  };

  const handleProjectValidatedSuccess = async (newProject: any) => {
    setIsCreatingModalOpen(false);
    const updatedList = await api.getProjects();
    setProjects(updatedList);
    
    // Find fully populated project
    const found = updatedList.find(p => p.id === newProject.id);
    setActiveProject(found || newProject);
    resetPhaseState();
    setCurrentView('dashboard');
  };

  const handleDeleteProject = async (projName: string) => {
    const targetProj = projects.find((p) => (p.name || p) === projName);
    if (!targetProj) return;

    try {
      if (targetProj.id) {
        await api.deleteProject(targetProj.id);
      }
      
      const updatedList = await api.getProjects();
      setProjects(updatedList || []);
      if (updatedList && updatedList.length > 0) {
        setActiveProject(updatedList[0]);
      } else {
        setActiveProject(null);
      }
      resetPhaseState();
      setCurrentView('dashboard');
    } catch (e) {
      console.error('Error al eliminar proyecto:', e);
    }
  };

  const [isApprovedRequirement, setIsApprovedRequirement] = useState<boolean>(false);

  const handleStartAnalysis = (text: string, result: any) => {
    setRequirementText(text);
    setAiAnalysisResult(result);
    setIsApprovedRequirement(false);
    setCurrentView('procesamiento');
  };

  const handleAnalysisCompleted = (finalResult: any) => {
    setAiAnalysisResult(finalResult);
    setCurrentView('salida');
  };

  const handleRejectRequirement = (feedbackMessage: string) => {
    setAiAnalysisResult((prev: any) => ({
      ...prev,
      rejection_feedback: feedbackMessage,
      clarification_questions: [
        `[SOLICITUD DE AJUSTE DEL EVALUADOR EN FASE 3]: ${feedbackMessage}`
      ],
      status: 'NEEDS_CLARIFICATION',
      is_sufficient: false
    }));
    setCurrentView('procesamiento');
  };

  const handleResetRequirementState = () => {
    setRequirementText('');
    setAiAnalysisResult(null);
    setIsApprovedRequirement(false);
    setCurrentView('entrada');
  };

  const handleViewChange = (targetView: 'dashboard' | 'entrada' | 'procesamiento' | 'salida' | 'aprobados' | 'grafo') => {
    if (isApprovedRequirement && targetView !== 'salida') {
      setRequirementText('');
      setAiAnalysisResult(null);
      setIsApprovedRequirement(false);
    }
    setCurrentView(targetView);
  };
  const isPhase2Locked = !aiAnalysisResult;
  const isPhase3Locked = !aiAnalysisResult || !aiAnalysisResult.refined_markdown;

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-sans text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium">Verificando sesión segura con NestJS...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  const projectNames = projects.map((p) => (typeof p === 'string' ? p : p.name));
  const activeProjectName = activeProject ? (typeof activeProject === 'string' ? activeProject : activeProject.name) : '';

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        projects={projectNames}
        activeProject={activeProjectName}
        onProjectChange={(name) => {
          handleResetRequirementState();
          handleSelectProjectName(name);
        }}
        onNewProject={() => setIsCreatingModalOpen(true)}
        onDeleteProject={handleDeleteProject}
        isPhase2Locked={isPhase2Locked}
        isPhase3Locked={isPhase3Locked}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          activeProject={activeProjectName}
          currentView={currentView}
          globalRulesCount={projects.length}
          user={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {!activeProject || projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <FolderKanban className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No hay ningún proyecto activo</h3>
              <p className="text-sm text-slate-500 max-w-md mt-1 mb-4">
                Para comenzar a analizar requerimientos, crea o selecciona un proyecto desde el menú lateral.
              </p>
              <button
                onClick={() => setIsCreatingModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                + Crear Primer Proyecto
              </button>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <DashboardView
                  projectName={activeProjectName}
                  activeProject={activeProject}
                  onNavigateToEntrada={() => setCurrentView('entrada')}
                />
              )}

              {currentView === 'entrada' && (
                <EntradaView
                  activeProject={activeProject}
                  onStartAnalysis={handleStartAnalysis}
                  initialText={requirementText}
                />
              )}

              {currentView === 'procesamiento' && (
                <ProcesamientoView
                  requirementText={requirementText}
                  activeProject={activeProject}
                  initialAiResult={aiAnalysisResult}
                  onCompleteAnalysis={handleAnalysisCompleted}
                />
              )}

              {currentView === 'salida' && (
                <SalidaView
                  activeProject={activeProject}
                  aiResult={aiAnalysisResult}
                  onNewRequirement={handleResetRequirementState}
                  onViewApproved={() => {
                    handleResetRequirementState();
                    setCurrentView('aprobados');
                  }}
                  onApproveSuccess={() => setIsApprovedRequirement(true)}
                  onNavigateToProcesamiento={() => setCurrentView('procesamiento')}
                  onRejectRequirement={handleRejectRequirement}
                  onRetryGeneration={(updatedResult) => {
                    setAiAnalysisResult(updatedResult);
                    if (updatedResult && (!updatedResult.is_sufficient || updatedResult.status === 'NEEDS_CLARIFICATION')) {
                      setCurrentView('procesamiento');
                    }
                  }}
                />
              )}

              {currentView === 'aprobados' && (
                <AprobadosView
                  activeProject={activeProject}
                  onNavigateToEntrada={() => setCurrentView('entrada')}
                  onRefineRequirement={(_code, markdown) => {
                    setRequirementText(markdown);
                    setAiAnalysisResult(null);
                    setIsApprovedRequirement(false);
                    setCurrentView('entrada');
                  }}
                />
              )}

              {currentView === 'grafo' && (
                <GrafoView
                  activeProject={activeProject}
                  onNavigateToEntrada={() => setCurrentView('entrada')}
                />
              )}
            </>
          )}
        </main>
        
        <Footer />
      </div>

      {/* Modal Guiado de Carga y Validación del Contexto Inicial del Proyecto */}
      {isCreatingModalOpen && (
        <ContextValidationModal
          onClose={() => setIsCreatingModalOpen(false)}
          onProjectValidated={handleProjectValidatedSuccess}
        />
      )}
    </div>
  );
}
