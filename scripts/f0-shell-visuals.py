"""Capture shell variants on an already signed-in synthetic F0 account."""
import importlib.util
from pathlib import Path
import time

spec = importlib.util.spec_from_file_location('tracer', Path(__file__).with_name('f0-native-tracer.py'))
t = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t)
font = t.adb('shell', 'settings', 'get', 'system', 'font_scale')
night = t.adb('shell', 'cmd', 'uimode', 'night').split(':')[-1].strip()
density = t.adb('shell', 'wm', 'density')
locales = t.adb('shell', 'cmd', 'locale', 'get-app-locales', t.PACKAGE).split('[')[-1].split(']')[0]


def overview(label='Overview', description='Continue your journal. Your complete daily workspace is being built.'):
    # Configuration changes may restart the activity at Diary.
    t.tap(label)
    t.find(description)


try:
    t.adb('shell', 'cmd', 'uimode', 'night', 'no')
    t.adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    overview()
    t.capture('06-overview-light')
    t.adb('shell', 'cmd', 'uimode', 'night', 'yes')
    overview()
    t.capture('07-overview-dark')
    t.adb('shell', 'settings', 'put', 'system', 'font_scale', '2.0')
    time.sleep(2)
    overview('Home')
    t.capture('08-overview-large')
    # 1080 pixels / (480 / 160) = 360 dp.
    t.adb('shell', 'wm', 'density', '480')
    time.sleep(2)
    overview('Home')
    t.capture('09-overview-narrow-large')
    t.adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    t.adb('shell', 'cmd', 'locale', 'set-app-locales', t.PACKAGE, '--locales', 'zh-TW')
    time.sleep(2)
    overview('總覽', '繼續記錄日記。完整每日工作區正在開發中。')
    t.capture('10-overview-zh-TW')
    t.adb('shell', 'cmd', 'locale', 'set-app-locales', t.PACKAGE, '--locales', 'zh-CN')
    time.sleep(2)
    overview('总览', '继续记录日记。完整每日工作区正在开发中。')
    t.capture('11-overview-zh-CN')
    print('PASS: light/dark, 2x font, 360 dp and shell zh-TW/zh-CN')
finally:
    t.adb('shell', 'settings', 'put', 'system', 'font_scale', font)
    t.adb('shell', 'cmd', 'uimode', 'night', night)
    t.adb('shell', 'wm', 'density', density.split('Override density:')[-1].strip() if 'Override density:' in density else 'reset')
    args = ['shell', 'cmd', 'locale', 'set-app-locales', t.PACKAGE]
    if locales:
        args += ['--locales', locales]
    t.adb(*args)
