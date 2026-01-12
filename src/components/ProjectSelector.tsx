import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types/schema';
import { Plus, Folder } from 'lucide-react';

interface ProjectSelectorProps {
    onSelect: (project: Project) => void;
}

export function ProjectSelector({ onSelect }: ProjectSelectorProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    async function fetchProjects() {
        setLoading(true);
        // Note: We use .schema('built_flexdata') to target the specific schema
        const { data, error } = await supabase
            .schema('built_flexdata')
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
        } else {
            setProjects(data || []);
        }
        setLoading(false);
    }

    async function createProject(e: React.FormEvent) {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        const { data, error } = await supabase
            .schema('built_flexdata')
            .from('projects')
            .insert([{ name: newProjectName }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project');
        } else if (data) {
            setProjects([data, ...projects]);
            setNewProjectName('');
            onSelect(data);
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Built Data</h1>
                <p className="text-lg text-gray-500">Select a project to manage your flexible data schema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create New Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800">New Project</h2>
                    </div>
                    <form onSubmit={createProject} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Project Name"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newProjectName.trim()}
                            className="w-full bg-gray-900 text-white font-medium py-3 px-4 rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                        >
                            Create Project
                        </button>
                    </form>
                </div>

                {/* Project List */}
                {loading ? (
                    [1, 2, 3].map((n) => (
                        <div key={n} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse h-48"></div>
                    ))
                ) : (
                    projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => onSelect(project)}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Folder className="w-24 h-24" />
                            </div>

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Folder className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 h-10">
                                    {project.description || 'No description provided.'}
                                </p>
                                <div className="mt-6 flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-4">
                                    <span>ID: {project.id.slice(0, 8)}...</span>
                                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
