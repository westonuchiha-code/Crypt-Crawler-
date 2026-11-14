"""Build index.html from src/: src/index.template.html (page, styles, menus) with the files in src/game/ joined in
name order and dropped in place of /*@GAME_SCRIPT@*/.

Usage: python3 tools/build.py [--check | --force]
The game files are one script cut into sections, not modules: they share one scope (the first opens `(() => {`, the
last closes it), so order matters and a `const` must still be defined above its first use at load time.
index.html is generated: edit src/, then build. If index.html has been changed by hand since the last build, the build
stops rather than overwrite it (--force overwrites; --check only reports whether index.html is up to date).
"""
import sys, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, 'index.html')
parts = sorted(glob.glob(os.path.join(ROOT, 'src', 'game', '*.js')))
tpl = open(os.path.join(ROOT, 'src', 'index.template.html')).read()
assert tpl.count('/*@GAME_SCRIPT@*/') == 1
built = tpl.replace('/*@GAME_SCRIPT@*/', ''.join(open(p).read() for p in parts))
old = open(out).read() if os.path.exists(out) else None
if old == built: print('index.html is up to date'); sys.exit(0)
if '--check' in sys.argv: print('index.html is OUT OF DATE: run python3 tools/build.py'); sys.exit(1)
newest_src = max(os.path.getmtime(p) for p in parts + [os.path.join(ROOT, 'src', 'index.template.html')])
if old is not None and os.path.getmtime(out) > newest_src and '--force' not in sys.argv:
    sys.exit('index.html is newer than everything in src/ and differs from the build: it looks hand-edited.\n'
             'Move the change into src/ (or run with --force to discard it).')
open(out, 'w').write(built)
print('built index.html from', len(parts), 'files,', len(built) // 1024, 'KB')
