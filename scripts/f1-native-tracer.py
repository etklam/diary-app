import importlib.util, json, os, re, sys, uuid, urllib.request
from pathlib import Path
s=importlib.util.spec_from_file_location('t','scripts/f0-native-tracer.py');t=importlib.util.module_from_spec(s);s.loader.exec_module(t)
t.OUT=Path('docs/evidence/f1/native');t.OUT.mkdir(parents=True,exist_ok=True)
private=Path('.scratch/f0-runtime/f1-native-private.json')
def locate(value):
 for attempt in range(6):
  for n in t.nodes():
   if value in [n.get('text'),n.get('resource-id'),n.get('content-desc')]:return n
  t.adb('shell','input','swipe','540','1800','540','650','350')
 raise AssertionError('Not visible: '+value)
def tap(value):
 n=locate(value);x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')));t.adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
def enter(value,text):
 assert re.fullmatch(r'[A-Za-z0-9@._/+-]+',text)
 tap(value);t.adb('shell','input','keycombination','113','29');t.adb('shell','input','text',text);t.adb('shell','input','keyevent','4')
def top():t.adb('shell','input','swipe','20','650','20','1900','350')
def request(path,body=None,token=None,method=None):
 headers={'content-type':'application/json','x-e2e-test-id':str(uuid.uuid4())}
 if token:headers['authorization']='Bearer '+token
 req=urllib.request.Request('http://127.0.0.1:3201'+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
 with urllib.request.urlopen(req,timeout=15) as r:return json.load(r)
def link(path):
 t.adb('shell','am','start','-a','android.intent.action.VIEW','-d','diaryapp://'+path,t.PACKAGE)
def main():
 if os.environ.get('DIARY_DISPOSABLE_TEST_ENV') != '1': raise RuntimeError('Disposable F1 API required')
 resume = len(sys.argv)>1 and sys.argv[1]=='resume'
 if not resume:
  t.launch();t.find('email-input');tap('Continue as guest');tap('Guide');t.find('Record the observation, explain your reasoning, then review what changed.');t.capture('01-public-guide');t.adb('shell','input','keyevent','4');tap('guest-write');tap('auth-switch')
  run=uuid.uuid4().hex[:8];credentials={'email':'f1-native-'+run+'@example.test','password':'SyntheticF1Original'};private.write_text(json.dumps(credentials))
  enter('name-input','SyntheticF1');enter('email-input',credentials['email']);enter('password-input',credentials['password']);enter('confirm-input',credentials['password']);tap('register-button');t.find('Account created. Sign in to continue.');t.capture('02-registered')
  pair=request('/api/auth/native/login',credentials)['data'];request('/api/user/settings',{'locale':'en'},pair['accessToken'],'PUT');private.write_text(json.dumps({**credentials,'token':pair['accessToken']}))
  tap('registered-sign-in');enter('password-input',credentials['password']);tap('login-button');t.find('quick-content');assert request('/api/diaries/summary',token=pair['accessToken'])['pagination']['total']==0
 else:
  credentials=json.loads(private.read_text());pair={'accessToken':credentials['token']};run=credentials['email'].split('@')[0].removeprefix('f1-native-')
 enter('quick-content','SyntheticF1Draft-'+run);t.find('Draft saved on device');t.capture('03-explicit-draft');t.adb('shell','input','keyevent','4')
 link('/preferences');t.find('settings-name');enter('settings-name','NativeF1Saved');enter('settings-timezone','Pacific/Kiritimati');tap('choice-calendar');enter('settings-trades','0');enter('settings-profit','9999999999999.99');enter('settings-holding','0');tap('settings-save');t.find('Preferences saved.');saved=request('/api/user/settings',token=pair['accessToken'])['settings'];assert saved['name']=='NativeF1Saved' and saved['expectedProfit']=='9999999999999.99' and saved['expectedMonthlyTrades']==0 and saved['timezone']=='Pacific/Kiritimati';t.capture('04-preferences-saved');print('PASS: native registration, guest continuation, explicit draft and exact settings',flush=True)
 top();top();tap('choice-dark');t.capture('05-dark-preferences');tap('choice-zh-TW');tap('settings-save');t.find('偏好已儲存。');t.capture('06-zh-TW');t.adb('shell','am','force-stop',t.PACKAGE);t.reopen();t.find('月曆');link('/preferences');t.find('偏好設定');t.capture('07-restart-locale-theme');print('PASS: preferences restart',flush=True)
 top();tap('choice-en');tap('settings-save');t.find('Preferences saved.');top();top();tap('choice-light');link('/security');t.find('security-current');enter('security-current','wrong-password');enter('security-new','SyntheticF1Changed');enter('security-confirm','SyntheticF1Changed');tap('security-change');t.tap('android:id/button1');t.find('Your current password is incorrect. (AUTH_LOGIN_INVALID_CREDENTIALS)');print('PASS: wrong password rejected natively',flush=True)
 top();top();enter('security-current',credentials['password']);enter('security-new','SyntheticF1Changed');enter('security-confirm','SyntheticF1Changed');tap('security-change');t.tap('android:id/button1');t.find('Security action completed. Sign in again.');private.write_text(json.dumps({**credentials,'password':'SyntheticF1Changed','token':pair['accessToken']}));t.capture('08-security-signed-out');enter('email-input',credentials['email']);enter('password-input','SyntheticF1Changed');tap('login-button');t.find('security-current');link('/diaries/quick');t.find('quick-content');assert t.find('quick-content').get('text')=='SyntheticF1Draft-'+run;t.capture('09-draft-after-revocation');print('PASS: new-password reauthentication retains encrypted draft',flush=True)
 metadata={'result':'PASS','checks':['native guest guide','registration then explicit sign-in','continuation opens Quick without submitting','exact decimal/zero settings','locale/theme/default Calendar restart','wrong current password','password change and reauthentication','encrypted draft retained across revocation'],'apkSha256':t.adb('shell','sha256sum',t.adb('shell','pm','path',t.PACKAGE).removeprefix('package:')).split()[0]}
 (t.OUT/'account-result.json').write_text(json.dumps(metadata,indent=2)+'\n')
if __name__ == '__main__':
    report = t.OUT / 'account-result.json'
    report.write_text(json.dumps({'result': 'RUNNING'}) + '\n')
    try:
        main()
    except Exception:
        report.write_text(json.dumps({'result': 'FAIL', 'detail': 'See local harness output; no credentials recorded.'}) + '\n')
        raise
