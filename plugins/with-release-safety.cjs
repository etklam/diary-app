const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withReleaseSafety(config) {
  return withAppBuildGradle(config, config => {
    const marker = '// diary-release-safety';
    if (config.modResults.contents.includes(marker)) return config;
    config.modResults.contents += `
${marker}
def validateDiaryRelease = tasks.register("validateDiaryRelease", Exec) {
    workingDir rootProject.projectDir.parentFile
    commandLine "node", "scripts/validate-release.cjs"
    doFirst {
        if (System.getenv("BETA_LOCAL_SIGNING") != "1" && System.getenv("EAS_BUILD") != "true") {
            throw new GradleException("Release signing must use authorized EAS credentials or the explicit local signing path")
        }
        def signing = android.buildTypes.release.signingConfig
        if (signing == null || signing.storeFile == null || signing.storeFile.name == "debug.keystore" || signing.keyAlias == "androiddebugkey") {
            throw new GradleException("Debug or missing release signing is not a beta identity")
        }
    }
}
tasks.configureEach { task ->
    if (task.name == "preReleaseBuild") task.dependsOn(validateDiaryRelease)
}
if (System.getenv("BETA_LOCAL_SIGNING") == "1") {
    android.signingConfigs.create("betaOperator") {
        storeFile file(System.getenv("BETA_KEYSTORE_PATH"))
        storePassword System.getenv("BETA_KEYSTORE_PASSWORD")
        keyAlias System.getenv("BETA_KEY_ALIAS")
        keyPassword System.getenv("BETA_KEY_PASSWORD")
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.betaOperator
}
`;
    return config;
  });
};
