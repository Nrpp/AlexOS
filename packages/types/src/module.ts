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
  /**
   * Ambient-safe: whether this module's widget is OK to show on the
   * always-on display while modules/presence's away-mode is locked.
   * Absent on most manifest.json files on disk (defaults to `true` -
   * personal/sensitive - on the backend, see `ModuleManifest` in
   * apps/api/app/models/schemas.py) but always present as an explicit
   * boolean on API responses, since Pydantic fills the default in
   * before serializing. Treat `undefined` the same as `true`.
   */
  personal?: boolean;
}

export interface RegisteredModule {
  manifest: ModuleManifest;
  hasBackend: boolean;
  hasFrontend: boolean;
}
