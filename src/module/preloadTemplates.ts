export const preloadTemplates = async function () {
  const templatePaths = ['modules/blood-n-guts/templates/preload-stub.html'];
  return loadTemplates(templatePaths);
};
