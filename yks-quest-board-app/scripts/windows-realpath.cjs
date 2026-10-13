// The desktop sandbox's async realpath fails on allowed Windows paths; the synchronous API works.
const fs = require('node:fs');
if (process.platform === 'win32') {
  fs.promises.realpath = async (path, options) => fs.realpathSync(path, options);
  require('node:module').syncBuiltinESMExports();
}
