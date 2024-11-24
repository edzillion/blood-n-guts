import { MODULE_ID } from "../constants";

export const preloadTemplates = async function () {
	const templatePaths = [
		// Add paths to "module/XXX/templates"
		//`/modules/${MODULE_ID}/templates/XXX.html`,
        `/modules/${MODULE_ID}/templates/advanced-config.html`,
        `/modules/${MODULE_ID}/templates/brush-config.html`,
        `/modules/${MODULE_ID}/templates/brush-controls.html`,
        `/modules/${MODULE_ID}/templates/token-config.html`,
        `/modules/${MODULE_ID}/templates/violence-config.html`,
	];

	return loadTemplates(templatePaths);
}
