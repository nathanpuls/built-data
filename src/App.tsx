import { BrowserRouter, Routes, Route, useParams, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { Layout, Database, Code2, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Project } from './types/schema';
import { ProjectSelector } from './components/ProjectSelector';
import { SchemaBuilder } from './components/SchemaBuilder';
import { DataGrid } from './components/DataGrid';

// Layout wrapper for authenticated/project context
function AppLayout() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="p-2 bg-black text-white rounded-xl shadow-lg shadow-blue-900/10">
            <Layout className="w-5 h-5" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">Built<span className="text-gray-400">FlexData</span></span>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

// Wrapper to load project data based on URL
function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) fetchProject(projectId);
  }, [projectId]);

  async function fetchProject(id: string) {
    const { data } = await supabase.schema('built_flexdata').from('projects').select('*').eq('id', id).single();
    if (data) {
      setProject(data);
    } else {
      navigate('/');
    }
    setLoading(false);
  }

  if (loading) return <div className="h-full flex items-center justify-center text-gray-400">Loading workspace...</div>;
  if (!project) return null;

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <aside className="w-16 bg-gray-900 flex flex-col items-center py-6 gap-4">
        <NavItem
          to={`/project/${projectId}/schema`}
          icon={<Database className="w-5 h-5" />}
          active={location.pathname.includes('/schema')}
          label="Builder Schema"
        />
        <NavItem
          to={`/project/${projectId}/data`}
          icon={<Layout className="w-5 h-5" />}
          active={location.pathname.includes('/data')}
          label="Client View"
        />
        <NavItem
          to={`/project/${projectId}/demo-player`}
          icon={<Play className="w-5 h-5" />}
          active={location.pathname.includes('/demo-player')}
          label="Demo Player"
        />
        <NavItem
          to={`/project/${projectId}/ai-integrator`}
          icon={<div className="flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform font-bold text-lg">✨</div>}
          active={location.pathname.includes('/ai-integrator')}
          label="AI Integrator"
        />
        <NavItem
          to={`/project/${projectId}/mapping-demo`}
          icon={<div className="w-5 h-5 flex items-center justify-center border-2 border-current rounded-full text-[10px] font-bold opacity-50">?</div>}
          active={location.pathname.includes('/mapping-demo')}
          label="Manual Mapping"
        />
        <div className="mt-auto">
          <NavItem
            to="/"
            icon={<Code2 className="w-5 h-5" />}
            label="All Projects"
            className="bg-gray-800 hover:bg-gray-700 text-gray-400"
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden bg-white">
        <Outlet context={{ project }} />
      </div>
    </div>
  );
}

function NavItem({ to, icon, active, label, className }: any) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      title={label}
      className={`p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center
        ${active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
          : className || 'text-gray-500 hover:bg-gray-800 hover:text-white'
        }`}
    >
      {icon}
    </button>
  );
}

// Route Components
function SchemaRoute() {
  const { project } = useProjectContext();
  return <SchemaBuilder project={project} />;
}

function DataRoute() {
  const { project } = useProjectContext();
  return <DataGrid project={project} />;
}

import { AudioPlayerDemo } from './components/demo/AudioPlayerDemo';
import { AudioEmbed } from './components/embeds/AudioEmbed';
import { MappingPlayground } from './components/demo/MappingPlayground';
function DemoRoute() {
  return <AudioPlayerDemo />;
}

// Helper to pass context down
import { useOutletContext } from 'react-router-dom';
function useProjectContext() {
  return useOutletContext<{ project: Project }>();
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone Embed Routes (No Layout) */}
        <Route path="/embed/audio/:projectId" element={<AudioEmbed />} />

        {/* Main App Routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<ProjectSelectorWrapper />} />
          <Route path="/project/:projectId" element={<ProjectWorkspace />}>
            <Route index element={<Navigate to="schema" replace />} />
            <Route path="schema" element={<SchemaRoute />} />
            <Route path="data" element={<DataRoute />} />
            <Route path="demo-player" element={<DemoRoute />} />
            <Route path="ai-integrator" element={<MappingPlayground />} />
            <Route path="mapping-demo" element={<MappingPlayground />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function ProjectSelectorWrapper() {
  const navigate = useNavigate();
  return <ProjectSelector onSelect={(p) => navigate(`/project/${p.id}/schema`)} />;
}
