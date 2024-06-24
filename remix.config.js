const nodeLibsBrowser = require('node-libs-browser');

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "cjs",
  watchPaths: ["./tailwind.config.ts"],
  serverPlatform: "node",

  // Configure polyfills for Node.js built-in modules
  browserNodeBuiltinsPolyfill: {
    modules: {
      url: nodeLibsBrowser.url,
      fs: true,
      path: nodeLibsBrowser.path,
      os: nodeLibsBrowser.os,
      stream: nodeLibsBrowser.stream,
      util: nodeLibsBrowser.util,
      events: nodeLibsBrowser.events,
      buffer: nodeLibsBrowser.buffer,
      assert: nodeLibsBrowser.assert,
      // Note: child_process and crypto cannot be polyfilled in the browser
      child_process: true,
      crypto: nodeLibsBrowser.crypto,
    }
  }
};
