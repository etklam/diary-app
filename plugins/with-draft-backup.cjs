const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Key and encrypted database are device-local; exclude both from cloud and transfer.
module.exports = function withDraftBackup(config) {
  config = withAndroidManifest(config, config => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = '@xml/draft_backup_rules';
    app.$['android:dataExtractionRules'] = '@xml/draft_extraction_rules';
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    const directory = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await fs.mkdir(directory, { recursive: true });
    const excludes = '<exclude domain="database" path="."/><exclude domain="file" path="SQLite/"/><exclude domain="sharedpref" path="SecureStore"/>';
    await fs.writeFile(path.join(directory, 'draft_backup_rules.xml'), `<full-backup-content>${excludes}</full-backup-content>`);
    await fs.writeFile(path.join(directory, 'draft_extraction_rules.xml'), `<data-extraction-rules><cloud-backup>${excludes}</cloud-backup><device-transfer>${excludes}</device-transfer></data-extraction-rules>`);
    return config;
  }]);
};
