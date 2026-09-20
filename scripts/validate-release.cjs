const { validateRelease } = require('../config/release.cjs');
try {
  const config = validateRelease(process.env);
  console.log(`Release configuration valid: ${config.variant}, build ${config.versionCode}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
