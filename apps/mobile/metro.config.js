const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

const workspaceRoot = path.resolve(__dirname, "../..");
const rootNodeModules = path.join(workspaceRoot, "node_modules");

config.resolver.blockList = [
  /node_modules\/\.pnpm\/electron@.*\/node_modules\/electron\/dist\/.*/,
];

config.resolver.nodeModulesPaths = [
  path.join(__dirname, "node_modules"),
  rootNodeModules,
];

// Pin react to a single pnpm-store version so Metro doesn't resolve multiple
// copies. Without this, packages with their own react@19.2.0 dep slot (e.g.
// styled-components in desktop) leak into transitive mobile resolutions
// and cause the "Invalid hook call" / "more than one copy of React" error.
const REACT_PKG = path.join(
  rootNodeModules,
  ".pnpm/react@19.1.0/node_modules/react",
);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: REACT_PKG,
  "react/jsx-runtime": path.join(REACT_PKG, "jsx-runtime"),
  "react/jsx-dev-runtime": path.join(REACT_PKG, "jsx-dev-runtime"),
  "react-dom": path.join(
    rootNodeModules,
    ".pnpm/react-dom@19.1.0_react@19.1.0/node_modules/react-dom",
  ),
  "react-native": path.join(rootNodeModules, "react-native"),
};

module.exports = config;
