"""Screenshot tour: plays through the game and captures its key moments, for eyeballing after visual changes.

Usage: python3 tools/tour.py <output folder>      (STAGED=1 skips the bot-played zones, bosses and cutscenes)
The bot plays every zone and four bosses for natural fight shots; set pieces (locked door, secret, traps, pod, each
weapon firing, menus, game over) are staged. About 74 pictures, 10 minutes. Look at every one: this is how the side
bars, the wrapping HUD line, the flat explosions and the over-strong flashes were found.
"""
import os, sys, json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT=sys.argv[1]; os.makedirs(OUT, exist_ok=True)
STAGED=os.environ.get('STAGED')
if not STAGED:
    for f in os.listdir(OUT): os.remove(os.path.join(OUT,f))
n=[43 if STAGED else 0]; log=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':960,'height':540})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type in('error','warning') and errs.append(m.type+': '+m.text[:160]))
    pg.goto('file://'+ROOT+'/index.html#nopad'); pg.wait_for_timeout(900)
    ev=lambda s:pg.evaluate('s => window.__cc.eval(s)',s)
    def shot(name):
        n[0]+=1; f=f'{OUT}/{n[0]:02d}-{name}.png'; pg.screenshot(path=f); log.append(os.path.basename(f))
    key=lambda k,ms=90:(pg.keyboard.press(k),pg.wait_for_timeout(ms))
    # ---- title and intro ----
    if not STAGED: shot('title')
    key('Enter'); pg.wait_for_timeout(300)
    for t in (() if STAGED else (1.5,5,9.5,13,15)):
        ev(f"intro.t={t}"); pg.wait_for_timeout(200); shot(f'intro-{t}')
    pg.wait_for_timeout(900); key('Space'); pg.wait_for_timeout(900)
    if not STAGED: shot('entrance')
    ev(open(ROOT+'/tools/bot.js').read())
    # ---- natural play in every zone: the bot fights, we wait for a busy moment ----
    for z in ([] if STAGED else range(10)):
        lv=z*10+ (4 if z else 2)
        ev(f"__bot.start({lv})"); got=0
        for i in range(900):
            ev("__bot.run(6)")
            st=json.loads(ev("JSON.stringify({v: monsters.filter(m=>!m.dead&&!m.prop&&Math.hypot(m.x-P.x,m.y-P.y)<7&&los(P.x,P.y,m.x,m.y)).length, anim:P.anim, lvl:level, run:running, hurt:P.hurt, sh:shots.length})"))
            if not st['run']: ev("if (summary) $('go').click(); else if (!running) { const cp=loadCheckpoint(); if (cp) continueGame(cp); }"); continue
            if st['v']>=2 and st['anim']>0.5 and got==0: pg.wait_for_timeout(60); shot(f'zone{z+1}-fight'); got=1
            elif st['v']>=1 and st['sh']>=2 and got==1 and i%7==0: pg.wait_for_timeout(60); shot(f'zone{z+1}-under-fire'); got=2
            if got==2: break
    # ---- bosses: walk the bot to four of them ----
    for lv in (() if STAGED else (10,30,60,100)):
        ev(f"__bot.start({lv})"); phase=0
        for i in range(2500):
            ev("__bot.run(8)")
            st=json.loads(ev("JSON.stringify({b:(()=>{const b=monsters.find(m=>m.boss&&!m.dead); return b?{w:!!b.woke,d:Math.hypot(b.x-P.x,b.y-P.y),hp:b.hp/b.maxHp,vis:los(P.x,P.y,b.x,b.y),p2:!!b.p2}:null})(), run:running, sum:summary, lvl:level})"))
            if st['sum']: pg.wait_for_timeout(120); shot(f'boss{lv}-zone-results'); break
            if not st['run']:
                if lv==100 and ev("endActive||level>=FINAL&&!bossAlive()"): break
                pg.wait_for_timeout(100); 
                if phase<9: shot(f'boss{lv}-game-over'); phase=9
                ev("const cp=loadCheckpoint(); if (cp) continueGame(cp); P.maxHp*=3; P.hp=P.maxHp;"); continue
            bb=st['b']
            if not bb:
                if phase<5: pg.wait_for_timeout(80); shot(f'boss{lv}-dead'); phase=5
                continue
            if bb['w'] and bb['vis'] and bb['d']<7 and phase==0: pg.wait_for_timeout(60); shot(f'boss{lv}-fight'); phase=1
            if bb['hp']<0.5 and bb['vis'] and phase==1: pg.wait_for_timeout(60); shot(f'boss{lv}-half-health'); phase=2
    # ---- ending and victory ----
    if not STAGED:
        ev("running=true; level=100; kills=412; runT=6400; victory()"); pg.wait_for_timeout(400)
        for t in (2,6,9.5,12,20,27):
            ev(f"ending.t={t}"); pg.wait_for_timeout(250); shot(f'ending-{t}')
        ev("ending.t=31.9"); pg.wait_for_timeout(900); shot('victory-menu')
    ev("endActive=false; document.body.classList.remove('intro'); introCanvas.classList.remove('on'); canvas.style.visibility='visible'; capEl.style.display='none'; $('endtitle').style.display=$('endroll').style.display='none'; flashEl.style.opacity=0; overlay.style.display='none'; paused=false; summary=false; P=newPlayer();")
    # ---- staged set pieces ----
    FACE="(function(t){ const c = map.indexOf(t), x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { let ok=true; for (let d=1; d<=2; d++) if (solid(x+.5+dx*d,y+.5+dy*d)) ok=false; if (ok) { P.x = x + .5 + dx * 1.9; P.y = y + .5 + dy * 1.9; P.a = Math.atan2(-dy, -dx); P.vx = P.vy = 0; return true; } } return false; })"
    ev("""(function(){ for (let k = 0; k < 600; k++) { P = newPlayer(); level = 24; generate(24); if (traps.length && darts.length && map.indexOf(LOCKED) >= 0 && map.indexOf(SECRET) >= 0) break; } monsters = monsters.filter(m=>m.prop); running = true; mapOn = 1; setMusic('zone2'); for (const w of ['ewand','dshot','phoenix','claw','hstaff']) { P.owned[w]=true; P.ammo[w]=30; } P.weapon='dshot'; msgT=0; msgEl.style.opacity=0; })()""")
    ev(FACE+"(LOCKED)"); pg.wait_for_timeout(250); shot('locked-door')
    ev("const k=items.find(i=>i.kind==='key'); P.x=k.x-1.2; P.y=k.y; P.a=0; if (solid(P.x,P.y)) { P.x=k.x+1.2; P.a=Math.PI; }"); pg.wait_for_timeout(250); shot('key')
    ev(FACE+"(SECRET)"); pg.wait_for_timeout(200); shot('secret-wall-before'); ev("P.x+=Math.cos(P.a)*0.9; P.y+=Math.sin(P.a)*0.9;"); pg.wait_for_timeout(350); shot('secret-room-opened')
    ev("const t=traps[0]; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(!solid(t.x+.5+dx*1.6,t.y+.5+dy*1.6)) { P.x=t.x+.5+dx*1.6; P.y=t.y+.5+dy*1.6; P.a=Math.atan2(-dy,-dx); } t.ph=-performance.now()/1000+0.3; msgT=0; msgEl.style.opacity=0;"); pg.wait_for_timeout(300); shot('spike-trap')
    ev("const d=darts[0]; P.x=d.x+.5+d.dx*3.2; P.y=d.y+.5+d.dy*3.2; P.a=Math.atan2(-d.dy,-d.dx); d.t=0.05; shots=[]; P.hp=P.maxHp;"); pg.wait_for_timeout(350); shot('dart-wall')
    # open room staging helper
    OPEN="""(function(lv){ level=lv; let best=0; for (let k=0;k<12;k++){ generate(lv); for (let cy=1;cy<H-1;cy++) for (let cx=1;cx<W-1;cx++){ if(solid(cx+.5,cy+.5)) continue; for(let i=0;i<8;i+=2){const a=i*Math.PI/4; let d=0; while(d<8&&!solid(cx+.5+Math.cos(a)*d,cy+.5+Math.sin(a)*d)&&!solid(cx+.5+Math.cos(a)*d-Math.sin(a)*1.8,cy+.5+Math.sin(a)*d+Math.cos(a)*1.8)&&!solid(cx+.5+Math.cos(a)*d+Math.sin(a)*1.8,cy+.5+Math.sin(a)*d-Math.cos(a)*1.8)) d+=0.25; if(d>best){best=d;P.x=cx+.5;P.y=cy+.5;P.a=a;}}} if(best>=6) break; } monsters=[]; items=[]; props=props.filter(p=>Math.hypot(p.x-P.x,p.y-P.y)>1); running=true; mapOn=1; P.maxHp=zoneMaxHp(lv); P.hp=P.maxHp; msgT=0; msgEl.style.opacity=0; for (const w in WEAPON_FLOOR){P.owned[w]=true;P.ammo[w]=40;} })"""
    AT="(d,o,k,lv)=>{const m=spawnMonster(P.x+Math.cos(P.a)*d-Math.sin(P.a)*o,P.y+Math.sin(P.a)*d+Math.cos(P.a)*o,k,lv||level); monsters.push(m); return m;}"
    ev(OPEN+"(27)"); ev(f"const at={AT}; const pd=at(3,0.3,'pod'); at(3.6,-0.6,'ghoul').stun=9; at(3.4,1,'skel').stun=9; at(4.2,0.2,'ghoul').stun=9; P.weapon='ewand';"); pg.wait_for_timeout(250); shot('pod-before')
    ev("hurtMonster(monsters[0],99)"); pg.wait_for_timeout(110); shot('pod-explosion'); pg.wait_for_timeout(1200); shot('killing-spree-and-corpses')
    ev(OPEN+"(45)"); ev(f"const at={AT}; const a=at(4.5,0,'imp'); const g=at(2.6,0,'golem'); a.woke=g.woke=true; a.rcool=0; g.stun=1.5; g.ranged=false; P.ward=30; P.weapon='plasma';"); pg.wait_for_timeout(1500); shot('infighting')
    ev(OPEN+"(35)"); ev(f"const at={AT}; at(1.4,0,'knight').woke=true; at(2.4,-1,'skel').woke=true; P.armor=50; P.fury=12; P.weapon='dshot'; P.hp=40;"); pg.wait_for_timeout(1300); shot('taking-hits-armour-fury')
    ev(OPEN+"(8)"); ev("['potion','crate','ammo','drop','armour','fury','ward','key'].forEach((k,i)=>items.push({x:P.x+Math.cos(P.a)*2.6-Math.sin(P.a)*(i-3.5)*0.45,y:P.y+Math.sin(P.a)*2.6+Math.cos(P.a)*(i-3.5)*0.45,kind:k,taken:false})); P.weapon='fist';"); pg.wait_for_timeout(250); shot('pickups')
    ev("pickupItem('crate')"); pg.wait_for_timeout(200); shot('weapon-found-message')
    # every weapon firing at a pack
    for w in ['fist','ewand','dshot','phoenix','claw','hstaff','mace','plasma','rocket','bfg']:
        ev(OPEN+"(75)"); ev(f"const at={AT}; [[2.6,0],[3.4,-0.9],[3.6,0.9],[4.6,0.1]].forEach(([d,o],i)=>{{const m=at({'1.1' if w=='fist' else 'd'},o,['trooper','alien','eye','sarge'][i]); m.stun=9; m.hp=m.maxHp=9999;}}); P.weapon='{w}'; P.fire=0; P.anim=0; msgT=0; msgEl.style.opacity=0;")
        pg.wait_for_timeout(200); ev("fire()"); pg.wait_for_timeout({'bfg':120,'rocket':420,'phoenix':430,'mace':330,'plasma':250}.get(w,90)); shot(f'weapon-{w}')
    # maps, pause and panels, death
    ev(OPEN+"(52)"); ev("for (let i=0;i<explored.length;i++) explored[i]=1; mapOn=2;"); pg.wait_for_timeout(250); shot('full-map'); ev("mapOn=1")
    key('Escape',350); shot('pause-menu'); key('ArrowDown'); key('Enter',200); shot('options'); key('Escape'); key('ArrowDown'); key('Enter',200); shot('controls'); key('Escape'); key('ArrowDown'); key('Enter',200); shot('records'); key('Escape'); key('ArrowDown'); key('Enter',200); shot('credits'); key('Escape'); key('Escape',200)
    ev(f"const at={AT}; const m=at(1.2,0,'horror'); P.hp=3; P.ward=0; P.armor=0; hurtPlayer(50,m.x,m.y,foeName(m));"); pg.wait_for_timeout(1100); shot('game-over')
    print('shots',n[0]); print('errors:',sorted(set(errs)) or 'none'); b.close()
print('\n'.join(log))
