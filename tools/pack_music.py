"""Render the game's music from Freedoom's MIDI tracks into music/<key>.mp3.

Usage: python3 tools/pack_music.py [<freedoom dir>]
With the checkout given, first copies the .mid files named below into art/music/. Needs fluidsynth, the FluidR3_GM
soundfont (Debian/Ubuntu: apt install fluidsynth fluid-soundfont-gm) and ffmpeg. Each track is cut to LENGTH seconds
with a fade at the end, because the game loops it. Tracks are BSD-3-Clause (Freedoom); the soundfont is MIT (Frank Wen).
"""
import sys, os, shutil, subprocess, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
LENGTH = 110
# game key -> Freedoom track. Zones share a track in pairs; index.html (MUSIC_FOR) decides when each plays.
TRACKS = {'title': 'd_inter', 'zone1': 'd_e1m1', 'zone2': 'd_e1m3', 'zone3': 'd_e2m1', 'zone4': 'd_e3m2', 'zone5': 'd_e4m1',
          'boss': 'd_e1m8', 'win': 'd_victor'}
if len(sys.argv) == 2:
    for t in TRACKS.values(): shutil.copy(os.path.join(sys.argv[1], 'musics', t + '.mid'), os.path.join(ROOT, 'art', 'music'))
for key, t in TRACKS.items():
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'a.wav')
        subprocess.run(['fluidsynth', '-ni', '-g', '0.7', '-F', wav, '-r', '32000', SF, os.path.join(ROOT, 'art', 'music', t + '.mid')],
                       check=True, capture_output=True)
        out = os.path.join(ROOT, 'music', key + '.mp3')
        # cut and mix down first, then level every track to the same average loudness (-20 dB) without clipping
        cutw = os.path.join(tmp, 'b.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-t', str(LENGTH), '-ac', '1', '-ar', '32000', cutw], check=True)
        info = subprocess.run(['ffmpeg', '-i', cutw, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
        mean = float(info.split('mean_volume:')[1].split('dB')[0]); peak = float(info.split('max_volume:')[1].split('dB')[0])
        gain = min(-20 - mean, -1 - peak)
        d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', cutw], capture_output=True, text=True).stdout)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', cutw, '-af', f'volume={gain:.1f}dB,afade=t=out:st={d - 4:.1f}:d=4', '-b:a', '56k', out], check=True)
        dur = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip()
        print(key, t, f'{float(dur):.0f}s', os.path.getsize(out) // 1024, 'KB')
