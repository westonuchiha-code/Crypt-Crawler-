"""Build index.html from src/: src/index.template.html (page, styles, menus) with the files in src/game/ joined in
name order and dropped in place of /*@GAME_SCRIPT@*/.

Usage: python3 tools/build.py [--check | --force | --release]
The game files are one script cut into sections, not modules: they share one scope (the first opens `(() => {`, the
last closes it), so order matters and a `const` must still be defined above its first use at load time.
index.html is generated: edit src/, then build. If index.html has been changed by hand since the last build, the build
stops rather than overwrite it (--force overwrites; --check only reports whether index.html is up to date).

--release writes the shippable game to dist/: the same page without the on-screen test pad (no *test-pad.js, no
rqpad.js), the asset, sound and music files, and LICENSES.txt with every notice the art and code licences require.
"""
import sys, os, glob, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, 'index.html')
parts = sorted(glob.glob(os.path.join(ROOT, 'src', 'game', '*.js')))
tpl = open(os.path.join(ROOT, 'src', 'index.template.html')).read()
assert tpl.count('/*@GAME_SCRIPT@*/') == 1
built = tpl.replace('/*@GAME_SCRIPT@*/', ''.join(open(p).read() for p in parts))
if '--release' in sys.argv:
    dist = os.path.join(ROOT, 'dist'); shutil.rmtree(dist, ignore_errors=True); os.makedirs(os.path.join(dist, 'music'))
    page = tpl.replace('<script src="rqpad.js"></script>\n', '')
    assert 'rqpad.js' not in page.split('<script>')[0], 'rqpad script tag not found in the template'
    page = page.replace('/*@GAME_SCRIPT@*/', ''.join(open(p).read() for p in parts if 'test-pad' not in p))
    open(os.path.join(dist, 'index.html'), 'w').write(page)
    for f in ('assets.js', 'sounds.js', 'three.min.js'): shutil.copy(os.path.join(ROOT, f), dist)
    for f in glob.glob(os.path.join(ROOT, 'music', '*.mp3')): shutil.copy(f, os.path.join(dist, 'music'))
    E = os.path.join(ROOT, 'art', 'enemies')
    with open(os.path.join(dist, 'LICENSES.txt'), 'w') as fh:
        fh.write('Crypt Crawler uses the following third-party work. See the in-game credits for the full list.\n')
        for title, path in (('Freedoom (sprites, sounds, music)', os.path.join(E, 'freedoom', 'COPYING.adoc')),
                            ('Blasphemer (sprites, sounds)', os.path.join(E, 'blasphemer', 'COPYING.md')),
                            ('three.js', os.path.join(ROOT, 'art', 'licenses', 'three.js-LICENSE.txt'))):
            fh.write('\n' + '=' * 78 + '\n' + title + '\n' + '=' * 78 + '\n\n' + open(path).read().strip() + '\n')
        fh.write('\n' + '=' * 78 + '\nMusic rendered with the FluidR3 GM soundfont by Frank Wen (MIT licence).\n')
    size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(dist) for f in fs)
    print('release build in dist/:', size // 1024, 'KB')
    sys.exit(0)
old = open(out).read() if os.path.exists(out) else None
if old == built: print('index.html is up to date'); sys.exit(0)
if '--check' in sys.argv: print('index.html is OUT OF DATE: run python3 tools/build.py'); sys.exit(1)
newest_src = max(os.path.getmtime(p) for p in parts + [os.path.join(ROOT, 'src', 'index.template.html')])
if old is not None and os.path.getmtime(out) > newest_src and '--force' not in sys.argv:
    sys.exit('index.html is newer than everything in src/ and differs from the build: it looks hand-edited.\n'
             'Move the change into src/ (or run with --force to discard it).')
open(out, 'w').write(built)
print('built index.html from', len(parts), 'files,', len(built) // 1024, 'KB')
