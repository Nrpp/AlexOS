/**
 * Shape of a module's manifest.json. Mirrors the Pydantic
 * `ModuleManifest` schema validated by the backend Module Manager
 * (apps/api/app/core/module_manager.py).
 */
export interface ModuleWidgetDeclaration {
  id: string;
  name: string;
  description?: string;
}

export interface ModuleManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: string[];
  dependencies: string[];
  routes: string[];
  widgets: ModuleWidgetDeclaration[];
  icon?: string;
}

export interface RegisteredModule {
  manifest: ModuleManifest;
  hasBackend: boolean;
  hasFrontend: boolean;
}
