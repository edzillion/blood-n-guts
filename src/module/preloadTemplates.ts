export const preloadTemplates = async (): Promise<void> => {
  const templatePaths = ['modules/blood-n-guts/templates/preload-stub.html'];
  return loadTemplates(templatePaths);
};
