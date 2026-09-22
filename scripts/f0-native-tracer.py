"""Disposable Android development tracer; never clears app storage or uninstalls.

Requires the F0 synthetic API, Metro on 8081, and a signed-out development app.
Only synthetic screen content is captured. ADB has no access to encryption keys.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request
import uuid
import xml.etree.ElementTree as ET

ADB = os.environ.get('ADB', str(Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk/platform-tools/adb.exe'))
SERIAL = os.environ.get('ANDROID_SERIAL', 'emulator-5554')
PACKAGE = 'com.etklam.diaryapp'
OUT = Path('docs/evidence/f0/native')
OUT.mkdir(parents=True, exist_ok=True)


def adb(*args, binary=False):
    result = subprocess.run([ADB, '-s', SERIAL, *args], check=True, capture_output=True)
    return result.stdout if binary else result.stdout.decode('utf-8', errors='replace').strip()


def nodes():
    adb('shell', 'uiautomator', 'dump', '/sdcard/f0-window.xml')
    return list(ET.fromstring(adb('shell', 'cat', '/sdcard/f0-window.xml')).iter('node'))


def find(value, timeout=25):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        for node in nodes():
            if value in [node.get('text'), node.get('resource-id'), node.get('content-desc')]:
                return node
        time.sleep(.3)
    raise AssertionError(f'Native element unavailable: {value}')


def tap(value):
    node = find(value)
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
    # The SDK 57 dev-client tool bubble overlaps the right edge of header actions.
    # Tap inside the left edge of Quick; release binaries have no tool bubble.
    x = x1 + 8 if value == 'global-quick' else (x1+x2)//2
    adb('shell', 'input', 'tap', str(x), str((y1+y2)//2))


def enter(value, text):
    if not re.fullmatch(r'[A-Za-z0-9@._-]+', text):
        raise ValueError('Only shell-safe synthetic ASCII inputs are supported')
    tap(value)
    adb('shell', 'input', 'text', text)
    adb('shell', 'input', 'keyevent', '4')


def capture(name):
    (OUT / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p', binary=True))


def launch():
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d',
        'diaryapp://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081', PACKAGE)


def reopen():
    # Restore like a user opening the installed app, without requesting a dev-client reload.
    adb('shell', 'monkey', '-p', PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1')


def open_quick():
    for attempt in range(3):
        tap('global-quick')
        try:
            find('quick-content', timeout=6)
            return
        except AssertionError:
            if attempt == 2:
                raise
            time.sleep(1)


def request(path, body=None, token=None):
    headers = {'content-type': 'application/json', 'x-e2e-test-id': str(uuid.uuid4())}
    if token:
        headers['authorization'] = f'Bearer {token}'
    data = None if body is None else json.dumps(body).encode()
    with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:3201' + path, data=data, headers=headers), timeout=15) as response:
        return json.load(response)


def main():
    if os.environ.get('DIARY_DISPOSABLE_TEST_ENV') != '1':
        raise RuntimeError('Set DIARY_DISPOSABLE_TEST_ENV=1; use only the disposable F0 server')
    launch()
    find('email-input')  # Stop if an existing account/draft is active; never discard it.
    run = uuid.uuid4().hex[:10]
    credentials = {'email': f'f0-native-{run}@example.test', 'password': 'SyntheticF02026'}
    request('/api/auth/register', credentials)
    enter('email-input', credentials['email'])
    enter('password-input', credentials['password'])
    tap('login-button')
    find('Timeline')
    capture('01-diary')
    open_quick()
    content = f'Synthetic-F0-draft-{run}'
    authoring_start = time.monotonic()
    enter('quick-content', content)
    find('Draft saved on device')
    authoring_ms = (time.monotonic() - authoring_start) * 1000
    capture('02-draft')
    adb('shell', 'am', 'force-stop', PACKAGE)
    reopen()
    find('Timeline')  # Session restored without entering credentials.
    open_quick()
    assert find('quick-content').get('text') == content
    find('Restored your draft from this device.')
    capture('03-restored')
    # Inspect ciphertext without copying private databases or keys to host artifacts.
    db_path = f'files/SQLite/quick-drafts-v1.db'
    encrypted = adb('exec-out', 'run-as', PACKAGE, 'cat', db_path, binary=True)
    assert encrypted and not encrypted.startswith(b'SQLite format 3')
    assert content.encode() not in encrypted
    tap('quick-save')
    find(content)
    capture('04-saved-detail')
    adb('shell', 'input', 'keyevent', '4')
    find('Timeline')
    find(content)
    capture('05-back-to-diary')
    tap('Research')
    find('Research tools are being added to the app.')
    open_quick()
    continuation = f'Synthetic-F0-return-{run}'
    enter('quick-content', continuation)
    find('Draft saved on device')
    adb('shell', 'input', 'keyevent', '4')
    find('Research tools are being added to the app.')
    tap('More')
    find('Manage your account and find support.')
    open_quick()
    assert find('quick-content').get('text') == continuation
    find('Append selected')  # Existing date selects append before explicit Save.
    tap('quick-save')
    find(content + '\n\n---\n\n' + continuation)
    adb('shell', 'input', 'keyevent', '4')
    find('Manage your account and find support.')
    capture('17-return-to-more')
    metadata = {
        'result': 'PASS', 'serial': SERIAL,
        'androidSdk': adb('shell', 'getprop', 'ro.build.version.sdk'),
        'abi': adb('shell', 'getprop', 'ro.product.cpu.abi'),
        'package': PACKAGE, 'buildKind': 'development APK plus current Metro JavaScript',
        'apkSha256': adb('shell', 'sha256sum', adb('shell', 'pm', 'path', PACKAGE).removeprefix('package:')).split()[0],
        'authoringProbe': {'characters': len(content), 'editAndPersistViaAdbMs': authoring_ms,
                           'note': 'Includes ADB input and UIAutomator polling overhead; not per-frame UI latency'},
        'checks': ['native login', 'encrypted draft persistence', 'process-death draft restoration',
                   'session restoration', 'explicit Quick save', 'Diary Detail', 'Back to Timeline',
                   'Quick returns to Research', 'same draft reopens from More', 'explicit append returns to More'],
        'ciphertext': {'bytes': len(encrypted), 'sha256': hashlib.sha256(encrypted).hexdigest(),
                       'sqlitePlaintextHeader': False, 'syntheticContentVisible': False},
    }
    (OUT / 'result.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    (OUT / 'result.json').write_text(json.dumps({'result': 'RUNNING'}) + '\n', encoding='utf-8')
    try:
        main()
    except Exception as error:
        (OUT / 'result.json').write_text(json.dumps({'result': 'FAIL', 'errorType': type(error).__name__,
            'note': 'Inspect the failing command; app storage and drafts were preserved.'}, indent=2) + '\n', encoding='utf-8')
        raise
