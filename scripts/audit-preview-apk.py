"""Read-only candidate inspection. Never prints signing credentials or APK config bodies."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile


def run(*args):
    result = subprocess.run(args, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError('Android artifact inspection command failed')
    return result.stdout


def audit(apk, tools, expected_certificate):
    aapt = str(tools / ('aapt2.exe' if os.name == 'nt' else 'aapt2'))
    manifest = run(aapt, 'dump', 'xmltree', str(apk), '--file', 'AndroidManifest.xml')
    badging = run(aapt, 'dump', 'badging', str(apk))
    if "name='com.etklam.diaryapp.preview'" not in badging:
        raise RuntimeError('Not the stable preview application ID')
    if 'application-debuggable' in badging or re.search(r'android:debuggable.*0xffffffff', manifest):
        raise RuntimeError('Debuggable APK is not a preview candidate')
    for name in ['usesCleartextTraffic', 'allowBackup']:
        if not re.search(r'android:' + name + r'.*=.*0x0\b', manifest):
            raise RuntimeError('Manifest does not explicitly disable ' + name)
    if 'devlauncher' in manifest.lower() or 'devmenu' in manifest.lower():
        raise RuntimeError('Development launcher/menu component in preview manifest')
    if 'android:networkSecurityConfig' in manifest:
        raise RuntimeError('Unexpected network security override requires separate TLS review')
    if 'draft_backup_rules' not in manifest and 'android:fullBackupContent' not in manifest:
        raise RuntimeError('Backup rules missing')
    with zipfile.ZipFile(apk) as archive:
        names = archive.namelist()
        if 'assets/index.android.bundle' not in names:
            raise RuntimeError('Embedded JavaScript bundle missing')
        if not any('libexpo-sqlite' in name for name in names):
            raise RuntimeError('Native SQLite library missing; SQLCipher still needs runtime verification')
        embedded = json.loads(archive.read('assets/app.config'))
        if embedded.get('extra', {}).get('buildVariant') != 'preview':
            raise RuntimeError('Embedded environment mismatch')
        if embedded.get('android', {}).get('package') != 'com.etklam.diaryapp.preview':
            raise RuntimeError('Embedded identity mismatch')
        if embedded.get('name') != 'Trade Basic Beta':
            raise RuntimeError('Wrong preview display name')
        extra = embedded.get('extra', {})
        # Validate only public configuration; never print the embedded config body.
        validator = subprocess.run(['node', '-e',
            "const c=require('./config/release.cjs');const fs=require('fs');const x=JSON.parse(fs.readFileSync(0,'utf8'));try{c.hostedOrigin(x.apiOrigin);c.supportDestination(x.supportUrl);if(typeof x.dataNotice!=='string'||x.dataNotice.trim().length<20)process.exit(1)}catch{process.exit(1)}"],
            input=json.dumps(extra), capture_output=True, text=True, cwd=Path(__file__).resolve().parent.parent)
        if validator.returncode:
            raise RuntimeError('Embedded public deployment/support configuration is missing or unsafe')
    for file in ['draft_backup_rules.xml', 'draft_extraction_rules.xml']:
        rules = run(aapt, 'dump', 'xmltree', str(apk), '--file', 'res/xml/' + file)
        if not all(value in rules for value in ['database', 'SQLite/', 'SecureStore']):
            raise RuntimeError('Incomplete backup exclusions')
    certificate = run('java', '-jar', str(tools / 'lib/apksigner.jar'), 'verify', '--print-certs', str(apk))
    if 'Android Debug' in certificate:
        raise RuntimeError('Debug signing certificate is not distributable')
    fingerprints = re.findall(r'certificate SHA-256 digest: ([0-9a-fA-F]+)', certificate)
    if len(fingerprints) != 1 or fingerprints[0].lower() != expected_certificate.lower().replace(':', ''):
        raise RuntimeError('Signing certificate does not match the approved stable identity')
    package = re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging)
    if not package:
        raise RuntimeError('Cannot read installed version identity')
    if str(embedded.get('android', {}).get('versionCode')) != package[2] or embedded.get('version') != package[3]:
        raise RuntimeError('Embedded and native version/build identities disagree')
    return {'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(), 'applicationId': package[1],
            'versionCode': package[2], 'versionName': package[3], 'signingCertificateSha256': fingerprints[0],
            'profile': 'preview', 'apiOrigin': embedded['extra'].get('apiOrigin'),
            'runtimeVerification': 'NOT VERIFIED by this static inspection'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('apk', type=Path)
    parser.add_argument('--build-tools', type=Path, required=True)
    parser.add_argument('--certificate-sha256', required=True)
    args = parser.parse_args()
    try:
        if not re.fullmatch(r'[0-9a-fA-F:]{64,95}', args.certificate_sha256):
            raise RuntimeError('Expected certificate SHA-256 required')
        print(json.dumps(audit(args.apk.resolve(), args.build_tools.resolve(), args.certificate_sha256), indent=2))
    except (RuntimeError, OSError, KeyError, zipfile.BadZipFile, ValueError) as error:
        parser.exit(1, 'APK audit failed: ' + str(error) + '\n')
