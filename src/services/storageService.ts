import { TwinLabProject } from '../types';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';

const STORAGE_KEY_PROJECTS = 'twinlab_projects_v1';
const STORAGE_KEY_ACTIVE_ID = 'twinlab_active_project_id';

export class StorageService {
  public static getAllProjects(): TwinLabProject[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load projects from storage', e);
    }
    // Default seed with sample projects
    this.saveAllProjects(SAMPLE_PROJECTS);
    return SAMPLE_PROJECTS;
  }

  public static loadAllProjects(): TwinLabProject[] {
    return this.getAllProjects();
  }


  public static saveAllProjects(projects: TwinLabProject[]) {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to storage', e);
    }
  }

  public static getActiveProjectId(): string {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || SAMPLE_PROJECTS[0].id;
  }

  public static setActiveProjectId(id: string) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  }

  public static getActiveProject(): TwinLabProject {
    const all = this.getAllProjects();
    const activeId = this.getActiveProjectId();
    const found = all.find((p) => p.id === activeId);
    return found || all[0] || SAMPLE_PROJECTS[0];
  }

  public static saveProject(project: TwinLabProject): TwinLabProject {
    const all = this.getAllProjects();
    const index = all.findIndex((p) => p.id === project.id);
    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      all[index] = updated;
    } else {
      all.unshift(updated);
    }

    this.saveAllProjects(all);
    return updated;
  }

  public static duplicateProject(project: TwinLabProject): TwinLabProject {
    const newProj: TwinLabProject = {
      ...JSON.parse(JSON.stringify(project)),
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name: `${project.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = this.getAllProjects();
    all.unshift(newProj);
    this.saveAllProjects(all);
    return newProj;
  }

  public static deleteProject(id: string): TwinLabProject[] {
    const all = this.getAllProjects().filter((p) => p.id !== id);
    this.saveAllProjects(all);
    if (this.getActiveProjectId() === id && all.length > 0) {
      this.setActiveProjectId(all[0].id);
    }
    return all;
  }

  public static exportToJson(project: TwinLabProject) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.name.toLowerCase().replace(/\s+/g, '_')}_twinlab.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public static exportProjectAsJson(project: TwinLabProject) {
    this.exportToJson(project);
  }

  public static parseJsonImport(jsonString: string): TwinLabProject {
    const parsed = JSON.parse(jsonString);
    if (!parsed.version || !parsed.ladder) {
      throw new Error('Invalid TwinLab Project format');
    }
    return parsed as TwinLabProject;
  }

  public static importProjectFromJson(jsonString: string): TwinLabProject | null {
    try {
      return this.parseJsonImport(jsonString);
    } catch (e) {
      console.error('Failed to import JSON project', e);
      return null;
    }
  }

}
