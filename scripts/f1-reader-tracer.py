"""Synthetic F1 Markdown/large-text/logout-all probe; preserves device storage."""
import importlib.util, json, os, re, subprocess, urllib.error, time, uuid
from pathlib import Path
s=importlib.util.spec_from_file_location('f',Path(__file__).with_name('f1-native-tracer.py'));f=importlib.util.module_from_spec(s);s.loader.exec_module(f)
def main():
 if os.environ.get('DIARY_DISPOSABLE_TEST_ENV')!='1':raise RuntimeError('Disposable fixture required')
 credentials=json.loads(f.private.read_text())
 try:f.request('/api/auth/me',token=credentials['token']);raise AssertionError('Peer token survived native password change')
 except urllib.error.HTTPError as e:assert e.code==401
 pair=f.request('/api/auth/native/login',{'email':credentials['email'],'password':credentials['password']})['data'];token=pair['accessToken']
 # The account probe intentionally left a synthetic draft. Explicitly save it before other checks.
 f.t.adb('shell','am','force-stop',f.t.PACKAGE);f.t.reopen();f.t.find('Calendar');f.link('/preferences');f.t.find('settings-name');f.tap('choice-light');f.link('/diaries/quick');content=f.t.find('quick-content').get('text')
 if content and content.startswith('SyntheticF1Draft-'):
  f.t.tap('quick-save');f.t.find('Write review');print('PASS: retained synthetic draft explicitly saved',flush=True)
 fixture=uuid.uuid4().hex
 markdown='# Native Markdown F1\n\n**Bold** and *italic*, ~~old~~ and &amp; entity.\n\n- [x] Completed task\n- [ ] Open task\n\n[Unsafe](javascript:alert(1)) and [Guide](/guide)\n\n<script>BAD_SCRIPT_TEXT</script>\n\n| Column A | Column B | Column C | Column D |\n| --- | --- | --- | --- |\n| First | Second | Third | Fourth |\n\n```text\n'+('wide_code_'*30)+'\n```\n\n![Synthetic pixel](http://10.0.2.2:3210/pixel.png?fixture='+fixture+')\n\n![Missing synthetic image](http://10.0.2.2:3210/missing.png)\n\n'+'\n\n'.join('Synthetic long paragraph '+str(i)+' '+('readable text '*20) for i in range(40))
 for day in range(29,0,-1):
  date=f'2024-02-{day:02d}'
  if f.request('/api/diaries/by-date?date='+date,token=token) is None:break
 else:raise AssertionError('No unused synthetic fixture date remains')
 diary=f.request('/api/diaries',{'date':date,'title':'F1 Markdown fixture','content':markdown,'tags':[],'stockSymbols':[]},token)
 assert diary['content']==markdown
 server=subprocess.Popen(['node','scripts/f1-image-server.mjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True);assert server.stdout.readline().strip()=='READY'
 font=f.t.adb('shell','settings','get','system','font_scale');density=f.t.adb('shell','wm','density')
 try:
  f.link('/diaries/'+diary['id']);time.sleep(.5);f.top();f.top();f.t.find('Native Markdown F1');f.t.capture('10-markdown-light');assert not any('BAD_SCRIPT_TEXT' in (n.get('text') or '') for n in f.t.nodes());assert any('Unsafe (Link unavailable)' in (n.get('text') or '') for n in f.t.nodes());print('PASS: native GFM rendered, HTML hidden, executable link inert',flush=True)
  cell=f.locate('Column A');_,y1,_,y2=map(int,re.findall(r'\d+',cell.get('bounds')));y=str((y1+y2)//2)
  for _ in range(2):f.t.adb('shell','input','swipe','950',y,'150',y,'400')
  f.t.find('Column D');f.t.capture('10b-table-horizontal')
  f.locate('Synthetic pixel');assert not any('Synthetic pixel (Image unavailable)' in (n.get('text') or '') for n in f.t.nodes());f.t.capture('11a-valid-image');f.locate('Missing synthetic image (Image unavailable)');f.t.capture('11-missing-image')
  f.link('/preferences');f.t.find('settings-name');f.tap('choice-dark');f.link('/diaries/'+diary['id']);time.sleep(.5);f.top();f.top();f.t.find('Native Markdown F1');f.t.capture('12-markdown-dark')
  f.t.adb('shell','settings','put','system','font_scale','2.0');f.t.adb('shell','wm','density','480');time.sleep(2);f.link('/diaries/'+diary['id']);time.sleep(.5);f.top();f.top();f.t.find('Native Markdown F1');f.t.capture('13-markdown-large');f.locate('Missing synthetic image (Image unavailable)');f.t.capture('14-markdown-large-scroll');print('PASS: dark, 2x font and 360dp Markdown scrolling',flush=True)
 finally:
  f.t.adb('shell','settings','put','system','font_scale',font);f.t.adb('shell','wm','density',density.split('Override density:')[-1].strip() if 'Override density:' in density else 'reset');server.communicate('stop\n',timeout=10);time.sleep(3)
 f.t.adb('shell','am','force-stop',f.t.PACKAGE);f.t.reopen();f.t.find('Calendar');f.link('/preferences');f.t.find('settings-name');f.tap('choice-light');f.tap('choice-zh-CN');f.tap('settings-save');f.t.find('偏好已保存。');f.t.capture('15-zh-CN');f.top();f.top();f.tap('choice-en');f.tap('settings-save');f.t.find('Preferences saved.')
 f.link('/security');f.t.find('security-current');f.tap('security-all');f.t.tap('android:id/button1');f.t.find('Security action completed. Sign in again.');f.t.capture('16-logout-all')
 try:f.request('/api/auth/me',token=token);raise AssertionError('Other device token survived logout-all')
 except urllib.error.HTTPError as e:assert e.code==401
 requests=json.loads((f.t.OUT/'image-requests.json').read_text());assert any(r['image']=='valid' for r in requests);assert not any(r['authorization'] or r['cookie'] for r in requests)
 (f.t.OUT/'reader-result.json').write_text(json.dumps({'result':'PASS','checks':['native GFM headings/emphasis/tasks/table/code','stored Markdown unchanged','raw HTML hidden','executable link inert','valid native image without auth headers','missing-image alt retained','dark/light','2x font and 360dp scrolling','zh-CN preference save','native logout-all denies second client'],'markdownCharacters':len(markdown)},indent=2)+'\n')
 print('PASS: native logout-all and other-client denial',flush=True)
if __name__ == '__main__':
    report = f.t.OUT / 'reader-result.json'
    report.write_text(json.dumps({'result': 'RUNNING'}) + '\n')
    try:
        main()
    except Exception:
        report.write_text(json.dumps({'result': 'FAIL', 'detail': 'See local harness output; no credentials recorded.'}) + '\n')
        raise
