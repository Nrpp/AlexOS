/**
 * Fallback used until the user ever saves a Home-widget selection (or
 * if that request fails) - shared between the Home page (which
 * renders it) and Settings (whose checkboxes must reflect the same
 * default, or they'd show "everything checked" while Home shows only
 * these two). See GET/PUT /api/v1/config/home-widgets.
 */
export const DEFAULT_HOME_MODULE_NAMES = ["clock", "notes"];
