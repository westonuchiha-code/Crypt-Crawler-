# Desktop build (Windows, Linux, macOS) for Steam or itch.io

The game is a web page; this folder wraps it in Electron so it runs as an ordinary desktop program.

```
python3 tools/build.py --release          # writes the shippable page to dist/ (no on-screen test pad, LICENSES.txt included)
rm -rf desktop/game && cp -r dist desktop/game
cd desktop
npm install                               # downloads Electron (about 100 MB) and electron-builder
npm start                                 # run the game in a window
npm run dist                              # make an installer for the system you are on (output in desktop/dist/)
```

- Build each platform's installer on that platform (or in CI); cross-building Windows from Linux needs Wine.
- `CC_SMOKE=1 npm start` loads the game, prints one `SMOKE {...}` line saying what loaded, and quits. On a machine with
  no display, run it under `xvfb-run -a`.
- itch.io also accepts the plain web build: zip the contents of dist/ and upload it as an HTML game.
- Steam: upload the unpacked folder electron-builder makes (`npm run pack`) as the depot; set the launch option to
  the executable. Steam achievements, overlay and cloud saves are not wired up.
- desktop/game/ and desktop/node_modules/ are build output: do not commit them.
