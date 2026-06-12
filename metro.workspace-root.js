const fs = require("fs");
const path = require("path");

function hasWorkspaces(packageJsonPath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return Boolean(packageJson.workspaces);
  } catch {
    return false;
  }
}

function findMetroWorkspaceRoot(projectRoot) {
  let currentDir = projectRoot;

  while (true) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return projectRoot;
    }

    const parentPackageJson = path.join(parentDir, "package.json");
    if (fs.existsSync(parentPackageJson) && hasWorkspaces(parentPackageJson)) {
      return parentDir;
    }

    currentDir = parentDir;
  }
}

module.exports = {
  findMetroWorkspaceRoot,
};
