"""Synthetic cold-link, owner-isolation, remote revocation and lost-response acceptance."""
import importlib.util
import json
import os
import re
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

spec = importlib.util.spec_from_file_location('f', Path(__file__).with_name('f1-native-tracer.py'))
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)


def control(mode=None):
    with urllib.request.urlopen('http://127.0.0.1:3211/' + ('?mode=' + mode if mode else '')) as response:
        return json.load(response)


def sign_in(credentials):
    f.enter('email-input', credentials['email'])
    f.enter('password-input', credentials['password'])
    f.tap('login-button')


def main():
    if os.environ.get('DIARY_DISPOSABLE_TEST_ENV') != '1':
        raise RuntimeError('Disposable fixture required')
    credentials = {'email': 'f1-boundary-' + uuid.uuid4().hex[:8] + '@example.test', 'password': 'SyntheticBoundaryA'}
    Path('.scratch/f0-runtime/f1-boundary-private.json').write_text(json.dumps(credentials))
    f.request('/api/auth/register', credentials)
    token = f.request('/api/auth/native/login', credentials)['data']['accessToken']
    f.request('/api/user/settings', {'name': 'BoundaryOwnerA', 'locale': 'en', 'timezone': 'Pacific/Kiritimati'}, token, 'PUT')
    count = f.request('/api/diaries/summary', token=token)['pagination']['total']
    f.t.adb('shell', 'am', 'force-stop', f.t.PACKAGE)
    f.link('/diaries/quick?date=2024-03-02')
    # The development launcher may require selecting the existing Metro project;
    # its pending external intent must survive that selection.
    f.t.find('http://10.0.2.2:8081')
    f.t.tap('http://10.0.2.2:8081')
    f.t.find('email-input')
    sign_in(credentials)
    assert f.t.find('quick-date').get('text') == '2024-03-02'
    assert f.request('/api/diaries/summary', token=token)['pagination']['total'] == count
    marker = 'SyntheticOwnerA-' + uuid.uuid4().hex[:8]
    f.enter('quick-content', marker)
    f.t.find('Draft saved on device')
    f.t.capture('17-cold-continuation')
    link_diary = f.request('/api/diaries', {'date': '2024-03-03', 'title': 'Synthetic link fixture', 'content': '[Open public guide](/guide)', 'tags': [], 'stockSymbols': []}, token)
    f.link('/diaries/' + link_diary['id'])
    # Android exposes the full paragraph bounds; the link span occupies only
    # the glyphs at the left, so the paragraph's midpoint is not the link.
    link = f.t.find('Open public guide')
    x1, y1, _, y2 = map(int, re.findall(r'\d+', link.get('bounds')))
    f.t.adb('shell', 'input', 'tap', str(x1 + 30), str((y1 + y2) // 2))
    f.t.find('Record the observation, explain your reasoning, then review what changed.')
    f.t.capture('17b-markdown-internal-link')
    f.link('/diaries/quick?date=2024-03-02')
    f.t.find('quick-content')

    f.request('/api/auth/logout-all', token=token, method='POST')
    f.t.adb('shell', 'input', 'keyevent', '3')
    f.t.reopen()
    f.t.find('email-input')
    other = {'email': 'f1-other-' + uuid.uuid4().hex[:8] + '@example.test', 'password': 'SyntheticF1Other'}
    f.request('/api/auth/register', other)
    other_token = f.request('/api/auth/native/login', other)['data']['accessToken']
    f.request('/api/user/settings', {'name': 'OwnerB', 'locale': 'en'}, other_token, 'PUT')
    sign_in(other)
    assert f.t.find('quick-content').get('text') != marker
    assert f.t.find('quick-date').get('text') == '2024-03-02'
    f.link('/preferences')
    assert f.t.find('settings-name').get('text') == 'OwnerB'
    f.t.capture('18-owner-b-isolation')
    f.link('/account')
    f.tap('logout-button')
    f.t.find('email-input')
    assert f.request('/api/auth/me', token=other_token)['data']['email'] == other['email']
    f.link('/diaries/quick')
    sign_in(credentials)
    assert f.t.find('quick-content').get('text') == marker
    f.t.capture('19-owner-a-restored')
    print('PASS: cold protected link, expiry continuation, A -> B -> A draft/settings isolation', flush=True)

    token = f.request('/api/auth/native/login', credentials)['data']['accessToken']
    before = control('drop')
    try:
        f.link('/security')
        f.t.find('security-current')
        f.tap('security-all')
        f.t.tap('android:id/button1')
        f.t.find('The result is uncertain. This device is signed out. Check your credentials before trying again; the action was not repeated.')
        f.t.capture('20-security-response-lost')
        time.sleep(2)
        after = control()
        delta = {key: after[key] - before[key] for key in ['requests', 'committed', 'dropped']}
        assert delta == {'requests': 1, 'committed': 1, 'dropped': 1}, delta
        try:
            f.request('/api/auth/me', token=token)
            raise AssertionError('Revoked peer token survived')
        except urllib.error.HTTPError as error:
            assert error.code == 401
    finally:
        control('normal')
    (f.t.OUT / 'boundary-result.json').write_text(json.dumps({
        'result': 'PASS',
        'checks': ['cold protected link retains date without mutation', 'native Markdown internal link opens public guide', 'remote expiry continuation', 'A-B-A native draft/settings isolation', 'current-client logout preserves peer session', 'committed lost response stays uncertain without retry', 'peer token denied'],
        'lostResponse': delta,
    }, indent=2) + '\n')
    print('PASS: committed logout-all response loss, one native attempt, peer denied', flush=True)


if __name__ == '__main__':
    report = f.t.OUT / 'boundary-result.json'
    report.write_text(json.dumps({'result': 'RUNNING'}) + '\n')
    try:
        main()
    except Exception:
        report.write_text(json.dumps({'result': 'FAIL', 'detail': 'See local harness output; no credentials recorded.'}) + '\n')
        raise
