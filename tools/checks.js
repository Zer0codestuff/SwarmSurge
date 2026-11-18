// Focused browser regressions. Runs the real engine through its existing debug hook.
window.runGameChecks = (g) => {
  const results = [];
  const check = (name, expression) => {
    g.start(1); g.pause();
    g.dbg('G.phase="play"; G.stage.gates.length=0; B.n=R.n=0; G.bot=null; buildCoarse(cR,R); buildGrid(gB,B);');
    try {
      const detail = g.dbg(expression);
      results.push({ name, pass: detail.pass, detail });
    } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  check('Glow keeps saturated terrain steady and leaves a halo beside a white light', `(() => {
    const world = new THREE.Scene(), view = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 4);
    view.position.z = 1;
    world.background = new THREE.Color(0xe05430);
    const light = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false}));
    light.position.x = -.5; world.add(light);
    const gl = renderer.getContext(), initialGlow = post.state.glow;
    const sample = (x) => {
      const pixel = new Uint8Array(4);
      gl.readPixels(x, gl.drawingBufferHeight >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return pixel[1];
    };
    const render = (on) => {
      post.state.glow = on; post.render(world, view);
      return [sample((gl.drawingBufferWidth >> 1) + 2), sample(Math.floor(gl.drawingBufferWidth * .8))];
    };
    try {
      post.setLook(.1);
      const off = render(false), on = render(true);
      return {pass: off[1] > 75 && off[1] < 95 && Math.abs(on[1] - off[1]) <= 3 && on[0] - off[0] >= 2, off, on};
    } finally {
      post.state.glow = initialGlow; setBattleGlow(THEMES[LEVELS[G.levelIdx].theme]);
      light.geometry.dispose(); light.material.dispose();
    }
  })()`);
  check('Sweep timing uses cannon position and rewards a late escape exactly once', `(() => {
    const b={z:G.z0-48}, life=G.lives;
    attackSweep(b); G.cx=3; updateEffects(1.26);
    const early=G.stage.counterShots===0 && G.lives===life;
    G.cx=G.aim=0; attackSweep(b); updateEffects(.92); G.aim=4; updateEffects(.34);
    const hit=G.stage.counterShots===0 && G.lives===life-1;
    G.cx=G.aim=0; attackSweep(b); updateEffects(.92); G.cx=2; updateEffects(.34);
    const late=G.stage.counterShots===COUNTER_VOLLEYS && !G.stage.sweep && G.lives===life-1;
    G.stage.counterShots=0; updateEffects(.34);
    return {pass:early && hit && late && G.stage.counterShots===0,early,hit,late};
  })()`);
  check('Fleet jets seat in every recoiling muzzle and disappear between volleys', `(() => {
    G.barrels=6; G.squad=4; G.twin=true; twinCannon.group.visible=true; setBarrels(6);
    fireCannon(STEP); renderWorld(.01); muzzleJets.pose(G.t);
    const mesh=muzzleJets.mesh, matrix=new THREE.Matrix4(), point=new THREE.Vector3(), bore=new THREE.Vector3();
    let n=0, error=0;
    for(const c of fleet) for(const b of c.barrels.children) {
      mesh.getMatrixAt(n++,matrix); point.setFromMatrixPosition(matrix);
      bore.set(0,0,-1.235).applyMatrix4(b.matrixWorld); error=Math.max(error,bore.distanceTo(point));
    }
    const all=mesh.count===36 && n===36 && error<.00001;
    muzzleJets.pose(G.t+.1); const dark=!mesh.visible;
    launchGiant(1,0); muzzleJets.pose(G.t+.12);
    return {pass:all && dark && mesh.count===6,all,dark,error};
  })()`);
  check('Counterfire counts volleys across the fleet and stacks with reactor giants', `(() => {
    const S=G.stage;
    S.counterShots=2; G.twin=true; G.squad=1; G.overdrive=3; G.charge=CHARGE_MAX-1;
    triggerReactor(S.reactor); tickReactor(S.reactor,3.2); triggerReactor(S.reactor);
    G.fireT=0; fireCannon(BASE_INTERVAL*2+.001);
    const factor=2*S.reactor.power, mixed=AEGIS|SUNWING;
    return {pass:B.n===10 && !S.counterShots && B.kind[3]===(mixed|GIANT) && B.hp[3]===factor*COUNTER_POWER*GIANT_HP
      && [0,1,2,4,5,6].every(i=>B.kind[i]===mixed && B.hp[i]===factor*COUNTER_POWER)
      && [7,8,9].every(i=>B.kind[i]===SUNWING && B.hp[i]===factor)};
  })()`);
  check('Aegis Guard armor follows gate copies and absorbs exactly one blast per soldier', `(() => {
    const g={cur:{t:'mul',v:3},x:0,w:4,z:-9,boost:1,flash:1};
    const i=spawn(B,0,-9,40,AEGIS|SUNWING); B.weapon[i]=3; applyGate(G.stage,g,i);
    writeBlue(); const mesh=blueForms[AEGIS_FORM], visible=mesh.near.count+mesh.far.count===3;
    blueInCircle(0,-9,3); const blocked=Array.from(B.hp.slice(0,3)).every(n=>n===40) && B.kind.slice(0,3).every(k=>k===SUNWING);
    blueInRect(0,-9,6,6); const hurt=B.hp.slice(0,3).every(n=>n===12);
    G.stage.counterShots=8; $('rretry').click();
    return {pass:visible && blocked && hurt && G.stage.counterShots===0 && !G.stage.sweep};
  })()`);
  check('Reactor diverts fire, launches every cannon, then restores normal output', `(() => {
    G.paused=false; G.overdrive=4; G.squad=1; G.twin=true; G.charge=CHARGE_MAX-1;
    useReactor(); for(let n=0;n<50;n++) step(STEP);
    const diverted=B.n===0 && G.charge===CHARGE_MAX-1;
    useReactor(); step(STEP);
    const launched=B.n===4 && B.hp[0]===6 && B.kind[0]===SUNWING && B.hp[3]===6*GIANT_HP && B.kind[3]===(SUNWING|GIANT);
    const r=G.stage.reactor; tickReactor(r,BURST_TIME); useReactor();
    return {pass:diverted && launched && r.phase==='spent' && r.power===1};
  })()`);
  check('Peak, overheat and retry use stage-local reactor state', `(() => {
    const normal=newReactor(false), surge=newReactor(true);
    for(const r of [normal,surge]) {triggerReactor(r);tickReactor(r,3.2);triggerReactor(r);}
    const r=G.stage.reactor; triggerReactor(r); tickReactor(r,VENT_TIME); G.charge=0; G.fireT=0; step(STEP);
    const vented=r.phase==='vented' && !triggerReactor(r) && B.n===1 && B.hp[0]===1;
    $('rretry').click();
    return {pass:normal.power===24 && surge.power===64 && vented && G.stage.reactor.phase==='ready'};
  })()`);
  check('Sunforge preserves the normal route and multiplies armed Sunwing copies', `(() => {
    startLevel(1); const S=G.stage, g=S.gates.find(g=>g.def.sunforge); B.n=0;
    const ordinary=spawn(B,g.x,g.z,1,0); applyGate(S,g,ordinary);
    const normalPower=B.hp.slice(0,B.n).reduce((sum,n)=>sum+n,0);
    B.n=0; const i=spawn(B,g.x,g.z,64,SUNWING); B.weapon[i]=4; applyGate(S,g,i);
    const total=B.hp.slice(0,B.n).reduce((sum,n)=>sum+n,0);
    writeBlue(); const form=blueForms[SUNWING_FORM];
    return {pass:normalPower===g.cur.v && Math.abs(total-64*g.cur.v*10)<.01 && B.kind.slice(0,B.n).every(k=>k===SUNWING) && B.weapon.slice(0,B.n).every(k=>k===4) && form.near.count+form.far.count===B.n && !!g.model.wheel};
  })()`);
  check('Gate bands preserve overlapping gate order and fast crossings', `(() => {
    const S=G.stage;
    const gate=(t,v,z,bit)=>({def:{t,v},cur:{t,v},alive:true,on:true,z,x:0,w:4,bit,boost:1,flash:1});
    // Suppress copies to keep all three crossings on the same troop.
    S.gates.push(gate('div',2,-8,1),gate('mul',3,-8,2),gate('mul',2,-9,4));
    const i=spawn(B,0,-7.9,10,0); B.vz[i]=-9;
    const capacity=B.N; B.N=RESERVE+1;
    buildGrid(gB,B); moveBlue(S,.2); B.N=capacity;
    return {pass:B.hp[i]===30 && B.mask[i]===7 && S.gates.every(g=>g.passes===1)};
  })()`);
  check('Middle-stage supply drops pay once, hold reserve fire, and reset on retry', `(() => {
    startLevel(2,1); G.paused=true; G.phase='play'; G.fireT=Infinity; B.n=R.n=0;
    const S=G.stage, r=S.drop, g=S.gates.find(q=>q.cur.up==='rifle');
    const i=spawn(B,g.x,g.z,g.need,0); absorb(S,g,i);
    const called=r.phase==='incoming' && !callSupplyDrop(r,G.cx);
    G.cx=G.aim=r.x; for(let i=0;i<150;i++)step(STEP);
    const caught=G.shield===1 && r.phase==='loaded' && r.remaining===3;
    triggerReactor(S.reactor); for(let i=0;i<120;i++)step(STEP);
    const held=r.remaining===3; triggerReactor(S.reactor);
    for(let i=0;i<120;i++)step(STEP);
    const fired=r.phase==='spent' && r.remaining===0 && !callSupplyDrop(r,G.cx);
    $('rretry').click();
    return {pass:called && caught && held && fired && G.stage.drop.phase==='packed',called,caught,held,fired};
  })()`);
  check('An uncollected drop expires and crossing its lane early does not collect it', `(() => {
    const r=createSupplyDrop(false); callSupplyDrop(r,-2);
    stepSupplyDrop(r,r.x,1,false); const early=r.phase==='incoming';
    stepSupplyDrop(r,0,3.1,false); const expired=r.phase==='missed';
    return {pass:early && expired && !stepSupplyDrop(r,r.x,2,false) && !callSupplyDrop(r,2)};
  })()`);
  check('Field armories preview inherited equipment and installation restores the exact mounts', `(() => {
    startLevel(0,1); const g=G.stage.gates.find(q=>q.def.up==='tank');
    G.chassis=2; syncSupplyPreviews(G.stage);
    const preview=g.rewardName===CHASSIS[3].toUpperCase() && !!g.model.icon.getObjectByName('vehicle-form-3');
    cannon.setChassis(4,2); cannon.animateVehicle(2.2,.01,0,0,0);
    const mid=cannon.rig.group.scale.y<1 && cannon.barrels.position.y<cannon.rig.barrelAnchor.y;
    cannon.animateVehicle(3,.01,0,0,0);
    const exact=cannon.barrels.position.equals(cannon.rig.barrelAnchor) && cannon.glow.position.equals(cannon.rig.glowAnchor) && !cannon.group.getObjectByName('fitting-collar').visible;
    return {pass:preview && mid && exact};
  })()`);
  check('Stationary delayed balls absorb contact damage', `(() => {
    const b=addBall(G.stage,G.root,0,-4,10,1,0,{delay:5});
    const i=spawn(B,0,-2,4,0); B.vz[i]=-9; buildGrid(gB,B); moveBlue(G.stage,.3);
    return {pass:b.hp===6 && B.hp[i]===0 && b.delay===5,hp:b.hp};
  })()`);
  check('Fast troops cannot tunnel through a ball', `(() => {
    const b=addBall(G.stage,G.root,0,-5,10,.7,0);
    const i=spawn(B,0,-2,4,0); B.vz[i]=-9; buildGrid(gB,B); moveBlue(G.stage,.7);
    return {pass:b.hp===6,hp:b.hp};
  })()`);
  check('Overkill preserves remaining troop power and grants the wreck bonus', `(() => {
    const b=addBall(G.stage,G.root,0,-4,20,1,0);
    const i=spawn(B,0,-2,100,0); B.vz[i]=-9; buildGrid(gB,B); moveBlue(G.stage,.3);
    return {pass:!b.alive && B.hp[i]===80 && G.overdrive===4,hp:B.hp[i]};
  })()`);
  check('Jumping troops fly over balls', `(() => {
    const b=addBall(G.stage,G.root,0,-4,20,1,0);
    const i=spawn(B,0,-2,100,0); launch(i,0,-8,.7); moveBlue(G.stage,.3);
    return {pass:b.hp===20 && B.hp[i]===100};
  })()`);
  check('Destroyed spawners cannot emit a final reinforcement wave', `(() => {
    const S=G.stage,model=M.buildSpawner('dome'); G.root.add(model.group);
    const s={def:{every:1,n:3,kind:0,unitHp:1,style:'dome'},x:0,z:-20,hp:0,max:10,timer:0,model,alive:true,label:makeLabel('spawner'),flash:0};
    S.spawners.push(s); S.time=10; S.waveT=Infinity; G.fireT=Infinity;
    step(STEP);
    return {pass:!s.alive && !model.group.visible && R.n===0,red:R.n};
  })()`);
  check('Blasters respect barriers and damage enemies after the barrier opens', `(() => {
    const j=spawn(R,0,-7,100,0), i=spawn(B,0,-3,10,0);
    B.weapon[i]=1; B.shot[i]=0;
    G.stage.gates.push({alive:true,def:{t:'barrier'},x:0,z:-5,w:4});
    buildGrid(gR,R); updateArsenal(G.stage,1); const blocked=R.hp[j]===100;
    G.stage.gates.length=0; updateArsenal(G.stage,1);
    return {pass:blocked && R.hp[j]===97,hp:R.hp[j]};
  })()`);
  check('Arc rifles hit three different enemies', `(() => {
    for(let k=0;k<4;k++) spawn(R,k*.6,-5,100,0);
    const i=spawn(B,0,-3,10,0); B.weapon[i]=3; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,1);
    return {pass:Array.from(R.hp.slice(0,4)).filter(x=>x<100).length===3,hp:Array.from(R.hp.slice(0,4))};
  })()`);
  check('Idle back-line troops do not consume the front-line firing budget', `(() => {
    const j=spawn(R,0,-20,100,0);
    for(let k=0;k<6;k++) { const i=spawn(B,0,k===5?-17:-2,10,0); B.weapon[i]=1; B.shot[i]=0; }
    buildGrid(gR,R); updateArsenal(G.stage,1);
    return {pass:R.hp[j]===97,hp:R.hp[j]};
  })()`);
  check('Troops choose a visible enemy when the closest enemy is behind cover', `(() => {
    spawn(R,0,-6,100,0); const j=spawn(R,3,-6,100,0);
    const i=spawn(B,0,-3,10,0); B.weapon[i]=1; B.shot[i]=0;
    G.stage.gates.push({alive:true,def:{t:'barrier'},x:0,z:-5,w:1});
    buildGrid(gR,R); updateArsenal(G.stage,1);
    return {pass:R.hp[0]===100 && R.hp[j]===97,hp:R.hp[j]};
  })()`);
  check('Idle weapons stay ready to acquire incoming enemies', `(() => {
    const i=spawn(B,0,-2,10,0); B.weapon[i]=1; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,STEP);
    return {pass:B.shot[i]<=.13,cooldown:B.shot[i]};
  })()`);
  check('Scatterguns hit a bounded close fan', `(() => {
    for(const [x,z] of [[0,-5],[1,-5],[-1,-5],[0,-9]]) spawn(R,x,z,100,0);
    const i=spawn(B,0,-3,10,0); B.weapon[i]=4; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,1);
    return {pass:Array.from(R.hp.slice(0,3)).every(hp=>hp<100) && R.hp[3]===100,hp:Array.from(R.hp.slice(0,4))};
  })()`);
  check('Railguns pierce a line and leave off-axis troops untouched', `(() => {
    for(const [x,z] of [[0,-6],[0,-8],[0,-11],[2,-7],[0,-14]]) spawn(R,x,z,100,0);
    const i=spawn(B,0,-3,10,0); B.weapon[i]=5; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,1);
    return {pass:R.hp[0]===89 && R.hp[1]<100 && R.hp[2]<100 && R.hp[3]===100 && R.hp[4]===100,hp:Array.from(R.hp.slice(0,5))};
  })()`);
  check('Flamethrower burns expire and reused slots have no old status', `(() => {
    const j=spawn(R,0,-5,100,0), i=spawn(B,0,-3,10,0); B.weapon[i]=6; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,1); const hit=R.hp[j];
    moveRed(G.stage,1); const burned=R.hp[j]<hit && R.burn[j]>0;
    moveRed(G.stage,1.1); const expired=R.burn[j]===0 && R.burnDamage[j]===0;
    R.hp[j]=0; compact(R); const k=spawn(R,0,-5,100,0);
    return {pass:burned && expired && R.burn[k]===0 && R.burnDamage[k]===0 && R.chill[k]===0};
  })()`);
  check('Frost slows troops temporarily and affects stationary balls', `(() => {
    const j=spawn(R,0,-5,100,0), i=spawn(B,0,-3,10,0); B.weapon[i]=7; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,1); moveRed(G.stage,.25);
    const slowed=R.chill[j]>0 && R.vz[j]<RED_TYPES[0].speed*.5;
    moveRed(G.stage,2); moveRed(G.stage,.25); const thawed=R.chill[j]===0 && Math.abs(R.vz[j]-RED_TYPES[0].speed)<1e-5;
    R.n=0; const ball=addBall(G.stage,G.root,0,-5,100,1,1,{delay:5});
    B.shot[i]=0; buildGrid(gR,R); updateArsenal(G.stage,1);
    return {pass:slowed && thawed && ball.hp<100 && ball.chill===1.8,slowed,thawed,chill:ball.chill};
  })()`);
  check('Ball frost and impact timers expire during deployment', `(() => {
    const ball=addBall(G.stage,G.root,0,-10,100,1,2,{delay:3});
    ball.chill=1; ball.impact=.15; updateMechanics(G.stage,.5);
    const waiting=ball.z===-10 && ball.delay===2.5 && ball.chill===.5 && ball.impact===0;
    updateMechanics(G.stage,.6); updateMechanics(G.stage,2); updateMechanics(G.stage,.1);
    return {pass:waiting && ball.chill===0 && ball.delay===0 && Math.abs(ball.z+9.8)<1e-6};
  })()`);
  check('Plasma reaches the wider splash radius and respects cover', `(() => {
    for(const [x,z] of [[0,-5],[2,-6],[-2,-6]]) spawn(R,x,z,100,0);
    G.stage.gates.push({alive:true,def:{t:'barrier'},x:-1,z:-5.5,w:.6});
    const i=spawn(B,0,-3,10,0); B.weapon[i]=8; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,1);
    return {pass:R.hp[0]<100 && R.hp[1]<100 && R.hp[2]===100,hp:Array.from(R.hp.slice(0,3))};
  })()`);
  check('Railguns shatter frost once and consume the chilled state', `(() => {
    const j=spawn(R,0,-6,200,0),i=spawn(B,0,-3,10,0); R.chill[j]=1.8; B.weapon[i]=5; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,STEP); const shattered=Math.abs(R.hp[j]-182.4)<1e-4 && R.chill[j]===0;
    B.shot[i]=0; updateArsenal(G.stage,STEP);
    return {pass:shattered && Math.abs(R.hp[j]-171.4)<1e-4,hp:R.hp[j]};
  })()`);
  check('Plasma ignition consumes burning without multiplying troops', `(() => {
    const j=spawn(R,0,-6,200,0),i=spawn(B,0,-3,10,0); R.burn[j]=2; R.burnDamage[j]=.9; B.weapon[i]=8; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,STEP); const ignited=Math.abs(R.hp[j]-188.8)<1e-4 && R.burn[j]===0 && R.burnDamage[j]===0;
    B.shot[i]=0; updateArsenal(G.stage,STEP);
    return {pass:ignited && Math.abs(R.hp[j]-180.8)<1e-4 && B.n===1 && R.n===1,hp:R.hp[j]};
  })()`);
  check('Unlocked weapons mix across spawns and survive a retry', `(() => {
    upgradeCannon('rifle'); upgradeCannon('flame'); upgradeCannon('frost');
    for(let k=0;k<12;k++) spawn(B,0,-3,10,0);
    const types=new Set(B.weapon.slice(0,B.n)), mask=G.weaponMask;
    enterStage(1); G.weaponMask=0; $('rretry').click();
    return {pass:types.size===3 && types.has(1) && types.has(6) && types.has(7) && G.weaponMask===mask && G.weapon===7};
  })()`);
  check('Gates preserve multiplied power at the population cap', `(() => {
    for(let k=0;k<420;k++) spawn(B,0,-8,1,0);
    applyGate(G.stage,{cur:{t:'mul',v:8},boost:1,flash:1,x:0,w:12,z:-8},0);
    const power=Array.from(B.hp.slice(0,B.n)).reduce((a,b)=>a+b,0);
    return {pass:B.n===420 && power===427,power};
  })()`);
  check('Cannon output survives a completely full pool', `(() => {
    for(let k=0;k<B.N;k++) spawn(B,0,-2,1,0);
    G.power=3; fireFrom(0);
    const power=Array.from(B.hp.slice(0,B.n)).reduce((a,b)=>a+b,0);
    return {pass:B.n===1000 && power===1003,power};
  })()`);
  check('Charged giants preserve their power in a full pool', `(() => {
    for(let k=0;k<B.N;k++) spawn(B,0,-2,1,0);
    G.power=2; G.charge=CHARGE_MAX-1; G.fireT=0; fireCannon(STEP);
    const power=Array.from(B.hp.slice(0,B.n)).reduce((a,b)=>a+b,0);
    return {pass:power===1032 && G.charge===0 && B.kind.some(k=>k===1),power};
  })()`);
  check('Escort cannons mirror the volley and reinforce armor', `(() => {
    upgradeCannon('barrel'); upgradeCannon('squad'); G.fireT=0; fireCannon(STEP);
    return {pass:G.squad===1 && G.shield===2 && B.n===6,units:B.n};
  })()`);
  check('Rapid doubles the rate and caps at x8', `(() => {
    upgradeCannon('rapid'); const first=G.rate; upgradeCannon('rapid');
    upgradeCannon('rapid'); upgradeCannon('rapid');
    return {pass:first===2 && G.rate===8,first,rate:G.rate};
  })()`);
  check('Tank armor absorbs a rolling ball crash', `(() => {
    upgradeCannon('tank'); addBall(G.stage,G.root,0,-1.4,20,1,0,{dmg:3});
    step(STEP); return {pass:G.lives===10 && G.shield===0,lives:G.lives,shield:G.shield};
  })()`);
  check('Armor resolves each hit and only overflow costs hearts', `(() => {
    G.shield=3; const first=damageCannon(2), firstLives=G.lives;
    const second=damageCannon(3);
    return {pass:first===0 && firstLives===10 && second===2 && G.lives===8 && G.shield===0 && G.guardFlash===1};
  })()`);
  check('Healing does not conceal armor damage during the same step', `(() => {
    G.shield=2; G.lives=12; damageCannon(1);
    return {pass:G.lives===12 && G.shield===1};
  })()`);
  check('All six transformations preserve common guns and reach their rig', `(() => {
    const forms=[];
    for(let k=1;k<=6;k++) {
      upgradeCannon('tank');
      forms.push(G.chassis===k && cannon.rig.formId===k && twinCannon.rig.formId===k && cannon.barrels.children.length===G.barrels && cannon.barrels.position.equals(cannon.rig.barrelAnchor));
      cannon.animateVehicle(G.t,.016,.5,4,.8);
    }
    return {pass:forms.every(Boolean) && G.shield===6 && G.power===144 && G.aircraft===1 && G.weapon===8,forms};
  })()`);
  check('Tank crates stop at the Titan while named crates reach the two ability forms', `(() => {
    for(let k=0;k<9;k++) upgradeCannon('tank');
    const capped=G.chassis===6 && cannon.rig.formId===6;
    upgradeCannon('lancer'); const lancer=G.chassis===7 && cannon.rig.formId===7 && twinCannon.rig.formId===7 && (G.weaponMask & (1<<10)) && cannon.barrels.position.equals(cannon.rig.barrelAnchor);
    cannon.animateVehicle(G.t,.016,.5,4,.8);
    upgradeCannon('dread'); const dread=G.chassis===8 && cannon.rig.formId===8 && (G.weaponMask & (1<<9)) && G.abilityT===ABILITY_SPECS.barrage.first;
    cannon.animateVehicle(G.t,.016,.5,4,.8);
    upgradeCannon('tank'); upgradeCannon('titan');
    return {pass:capped && !!lancer && !!dread && G.chassis===8,capped,lancer,dread};
  })()`);
  check('The prism lance pierces armor in its lane, wears down walls and spares vault seals', `(() => {
    const S=G.stage; G.chassis=7; G.cx=G.aim=0; G.power=1; G.armyAvg=0; S.tower.hp=S.tower.max=1e6;
    const crab=spawnRed(.4,G.z0-20,8,100), side=spawnRed(4,G.z0-20,0,100);
    const wall={def:{t:'ice',hp:1000},x:0,z:G.z0-30,w:3,alive:true,on:true,hp:1000,flash:0};
    const seal={def:{t:'ice',hp:1000,vault:true},x:0,z:G.z0-34,w:3,alive:true,on:true,hp:1000,flash:0};
    S.gates.push(wall,seal);
    G.abilityT=0; updateAbility(S,.01);
    const spec=ABILITY_SPECS.lance;
    return {pass:R.hp[crab]===70 && R.hp[side]===100 && wall.hp===850 && seal.hp===1000 && S.tower.hp===1e6-60 && spec.targetCap===.025 && G.abilityT===spec.every,crab:R.hp[crab],wall:wall.hp,tower:S.tower.hp};
  })()`);
  check('The barrage shells the heaviest pack after its flight time and caps target damage', `(() => {
    const S=G.stage; G.chassis=8; G.power=1; G.armyAvg=0; S.tower.hp=S.tower.max=1000;
    const pack=[spawnRed(2,G.z0-20,0,100),spawnRed(2.4,G.z0-20.5,0,100)], far=spawnRed(-5,G.z0-40,8,100);
    G.abilityT=0; updateAbility(S,.01);
    const shells=G.effects.filter(e=>e.kind==='shell');
    const waiting=R.hp[pack[0]]===100;
    for(let k=0;k<90;k++) updateEffects(STEP);
    return {pass:shells.length===4 && waiting && R.hp[pack[0]]<100 && R.hp[pack[1]]<100 && Math.abs(R.hp[far]-(100-24*.35))<.01 && S.tower.hp>=1000-4*10 && S.tower.hp<1000 && !G.effects.some(e=>e.kind==='shell'),shells:shells.length,hp:[R.hp[pack[0]],R.hp[far],S.tower.hp]};
  })()`);
  check('Mortars fire over cover and shock lances shove enemies back without crossing walls', `(() => {
    const S=G.stage;
    S.gates.push({def:{t:'barrier'},x:0,z:-5,w:4,alive:true,on:true,hp:100,flash:0});
    const hidden=spawnRed(0,-8,0,100), blaster=spawn(B,0,-2,10,0), mortar=spawn(B,.5,-2,10,0);
    B.weapon[blaster]=1; B.weapon[mortar]=9; B.shot[blaster]=B.shot[mortar]=0; buildGrid(gR,R); updateArsenal(S,.01);
    const lobbed=Math.abs(R.hp[hidden]-(100-10*WEAPON_SPECS[9].damage))<.001 && Math.abs(B.shot[blaster]-.12)<.001;
    const open=spawnRed(4,-10,0,100), heavy=spawnRed(-4,-10,1,100), walled=spawnRed(0,-4.5,0,100);
    hitArmedRed(open,1,WEAPON_SPECS[10],1); hitArmedRed(heavy,1,WEAPON_SPECS[10],1); hitArmedRed(walled,1,WEAPON_SPECS[10],1);
    const knock=WEAPON_SPECS[10].knock;
    return {pass:lobbed && Math.abs(R.z[open]-(-10-knock))<.001 && Math.abs(R.z[heavy]-(-10-knock*.35))<.001 && R.z[walled]===-4.5 && R.chill[open]>0,lobbed,z:[R.z[open],R.z[heavy],R.z[walled]]};
  })()`);
  check('Troops stop and turn to the camera once the stage is cleared', `(() => {
    const i=spawn(B,0,G.z0-10,5,0); B.vx[i]=2; B.vz[i]=-9; G.phase='clear';
    for(let k=0;k<60;k++){ buildGrid(gB,B); moveBlue(G.stage,1/60); }
    const moved=Math.abs(B.z[i]-(G.z0-10));
    return {pass:B.vz[i]>0 && Math.abs(B.vx[i])<.05 && moved<2.2 && B.hp[i]===5,vz:B.vz[i],vx:B.vx[i],moved};
  })()`);
  check('Every world has a boss card and the introduction never holds the headless simulation', `(() => {
    const cards=BOSS_CARDS.length===LEVELS.length && BOSS_CARDS.every(c=>c.length===2 && c.every(t=>typeof t==='string' && t.length>2 && !t.includes('\u2014')));
    startLevel(0,2);
    return {pass:cards && !G.cine && !G.hitStop && G.phase==='intro',cards,cine:G.cine,stop:G.hitStop};
  })()`);
  check('Records keep personal bests and medals need a full run', `(() => {
    const r={worlds:{}};
    const a=recordRun(r,3,{army:500,combo:20,kills:90,time:70,bossTime:20,heartsLost:2,full:true});
    const b=recordRun(r,3,{army:900,combo:10,kills:50,time:60,bossTime:9,heartsLost:0,full:true});
    const c=recordRun(r,3,{army:1e9,combo:5,kills:5,time:5,bossTime:1,heartsLost:0,full:false});
    const e=r.worlds[3];
    startLevel(0,1); const partial=G.fullRun; startLevel(0); const full=G.fullRun && G.hurt===0;
    return {pass:a.earned.length===0 && !a.fresh.army && b.fresh.army && !b.fresh.combo && b.fresh.time && b.earned.join()==='flawless,swift,overpowered' && c.earned.length===0 && recordRun({worlds:{}},1,{time:90,bossTime:30,heartsLost:1,full:true,hardcore:true}).earned.join()==='hardcore' && e.time===60 && e.army===1e9 && e.combo===20 && e.wins===3 && medalTotal(r)===3 && clock(65.04)==='1:05.0' && clock(9.96)==='0:10.0' && !partial && full,a,b,c,e,partial,full};
  })()`);
  check('Results credit a victory once and compare splits to the previous best run', `(() => {
    startLevel(5,2); G.phase='play'; G.fullRun=true; G.time=62; G.stageTimes=[18,24,20]; G.stage.time=20;
    const prev=records.worlds[5]; records.worlds[5]={wins:2,time:65,splits:[20,22,23],medals:[]};
    try {
      bossDefeated(G.stage); const saved=G.victory;
      showResult(true); const entry=records.worlds[5], ui=$('rmsg');
      return {pass:recordVictory()===saved && entry.wins===3 && entry.splits.join()==='18,24,20' &&
        ui.querySelectorAll('.stage-times .ahead').length===2 && ui.querySelectorAll('.stage-times .behind').length===1 &&
        !!ui.querySelector('.medal.fresh') && ui.textContent.includes('NEW BEST')};
    } finally { if(prev) records.worlds[5]=prev; else delete records.worlds[5]; saveRecords(records); }
  })()`);
  check('Stage times include retries, and old records gain a reference on a tied full run', `(() => {
    for(let i=0;i<15;i++)step(STEP); const first=G.stageTimes[0];
    $('rretry').click(); G.phase='play'; step(STEP);
    const retry=first>0 && Math.abs(G.stageTimes[0]-G.time)<1e-8 && G.time>first;
    const r={worlds:{2:{time:60,medals:[]}}};
    const run={full:true,time:60,splits:[12,22,26],heartsLost:2,bossTime:26};
    recordRun(r,2,run); recordRun(r,2,{...run,full:false,time:20,splits:[5,5,10]});
    recordRun(r,2,{...run,time:70,splits:[10,40,20]});
    return {pass:retry && r.worlds[2].splits.join()==='12,22,26'};
  })()`);
  check('Every world has its own score and the arrangement grows with the battle', `(() => {
    const ids=new Set(LEVELS.map(L=>{music.setMode('battle',L.theme,THEMES[L.theme].sky);const s=music.score;return [s.root,s.bpm,s.scale,s.loop,s.arp,s.bass,s.melody].join('|');}));
    const kinds=(level,mode,boss)=>{const set=new Set();for(let i=0;i<64;i++)for(const n of music.plan(i,level,mode,boss))set.add(n[0]);return [...set].sort().join();};
    const calm=kinds(.15,'battle',false), full=kinds(1,'battle',false), boss=kinds(1,'battle',true), camp=kinds(1,'menu',false);
    music.setMode('menu');
    return {pass:ids.size===LEVELS.length && calm==='arp,pad' && full==='arp,bass,hat,kick,lead,pad,snare' && boss==='arp,bass,boom,hat,kick,lead,pad,snare' && camp==='arp,pad' && music.mode==='menu',ids:ids.size,calm,full,boss,camp};
  })()`);
  check('Prism portals send one copy to every exit and mirror gates add a twin once', `(() => {
    const S=G.stage;
    const gate=(def,k)=>({def,cur:def,bit:1<<k,hi:false,x:def.x,z:G.z0-def.d,w:def.w,alive:true,on:true,flash:0,boost:1,model:{}});
    const prism=gate({t:'prism',x:0,d:6,w:3.6,to:[{x:-4,d:8},{x:0,d:8},{x:4,d:8}]},0), mirror=gate({t:'mirror',x:-4,d:10,w:3},1);
    S.gates.push(prism,mirror);
    const i=spawn(B,.2,G.z0-5.9,10,0); B.vx[i]=0; B.vz[i]=-9; B.weapon[i]=3; buildGrid(gB,B); moveBlue(S,.05);
    const xs=[...B.x.slice(0,B.n)].map(Math.round).sort((a,b)=>a-b);
    const split=B.n===3 && [-4,0,4].every(e=>[0,1,2].some(k=>Math.abs(B.x[k]-e)<.75)) && [0,1,2].every(k=>B.hp[k]===10 && B.weapon[k]===3 && Math.abs(B.z[k]-(G.z0-8))<.6);
    const left=[0,1,2].find(k=>B.x[k]<-3); B.x[left]=-4; B.z[left]=G.z0-9.9; B.vx[left]=0; B.vz[left]=-9;
    buildGrid(gB,B); moveBlue(S,.05);
    const twin=B.n===4 && Math.abs(B.x[3]-4)<.01 && B.hp[3]===10 && B.hp[left]===10 && B.cm[3]===6;
    B.z[left]=G.z0-9.9; buildGrid(gB,B); moveBlue(S,.05);
    const once=B.n===4;
    // A full pool folds the copies into the troop that fits.
    B.n=1; B.hp[0]=10; B.mask[0]=0; B.x[0]=0; B.z[0]=G.z0-5.9; B.vx[0]=0; B.vz[0]=-9; B.adur[0]=0;
    const real=B.N; B.N=RESERVE+1; buildGrid(gB,B); moveBlue(S,.05); B.N=real;
    return {pass:split && twin && once && B.n===1 && B.hp[0]===30,split,twin,once,n:B.n,hp:B.hp[0],xs};
  })()`);
  check('Every split gate replaces a multiplier of the same strength', `(() => {
    const prisms=[], mirrors=[];
    LEVELS.forEach((level,li)=>level.stages.forEach((s,si)=>s.gates.forEach(g=>{
      if(g.t==='prism') prisms.push([li+1,si+1,g.to.length,g.v]);
      if(g.t==='mirror') mirrors.push([li+1,si+1,g.v]);
    })));
    return {pass:prisms.length===9 && mirrors.length===15 && prisms.every(p=>p[2]===3 && p[3]===undefined) && mirrors.every(m=>m[2]===undefined),prisms:prisms.length,mirrors:mirrors.length};
  })()`);
  check('Grounded vehicle parts move only while driving', `(() => {
    cannon.setChassis(1); cannon.animateVehicle(0,.1,0,0,0);
    const belt=cannon.rig.group.getObjectByName('belt'), start=Array.from(belt.instanceMatrix.array);
    cannon.animateVehicle(1,.1,0,0,0); const idle=start.every((v,i)=>v===belt.instanceMatrix.array[i]);
    cannon.animateVehicle(2,.1,0,6,0); const moved=start.some((v,i)=>v!==belt.instanceMatrix.array[i]);
    const stop=Array.from(belt.instanceMatrix.array); cannon.animateVehicle(3,.1,0,0,0);
    const stopped=stop.every((v,i)=>v===belt.instanceMatrix.array[i]);
    const feet=[];
    for(const id of [3,6]) {
      cannon.setChassis(id); cannon.animateVehicle(0,.1,0,0,0);
      const leg=cannon.rig.group.getObjectByName(id===3?'spider-leg':'titan-leg'), a=leg.rotation.toArray();
      cannon.animateVehicle(1,.1,0,0,0); const still=a.every((v,i)=>v===leg.rotation.toArray()[i]);
      cannon.animateVehicle(2,.1,0,6,0); feet.push(still && a.some((v,i)=>v!==leg.rotation.toArray()[i]));
    }
    return {pass:idle && moved && stopped && feet.every(Boolean)};
  })()`);
  check('Specialist transformations unlock their equipment and never downgrade', `(() => {
    upgradeCannon('spider'); const spider=G.chassis===3 && G.weapon===4 && G.rate===2;
    upgradeCannon('hover'); const hover=G.chassis===4 && (G.weaponMask & (1<<7));
    upgradeCannon('railfort'); const rail=G.chassis===5 && (G.weaponMask & (1<<5));
    upgradeCannon('titan'); upgradeCannon('siege');
    return {pass:!!(spider && hover && rail && G.chassis===6 && G.weaponMask & (1<<8))};
  })()`);
  check('Titan and its mixed arsenal survive retry and reset for a new world', `(() => {
    upgradeCannon('frost'); upgradeCannon('titan'); enterStage(1); $('rretry').click();
    const retry=G.chassis===6 && cannon.rig.formId===6 && G.aircraft===1 && G.weaponMask===(1<<7|1<<8);
    startLevel(0);
    return {pass:retry && G.chassis===0 && cannon.rig.formId===0 && G.weaponMask===0 && cannon.group.getObjectByName('base-cannon').visible};
  })()`);
  check('Air upgrades select distinct models without changing an ongoing pass', `(() => {
    const models=[];
    for(let tier=1;tier<=3;tier++) {
      upgradeCannon('air'); G.airTier=tier; G.airPass=1.5; renderWorld(0);
      models.push(supportAircraft(tier).group.name==='support-aircraft-'+tier && [...airWings.values()].filter(model=>model.group.visible).length===1);
    }
    G.aircraft=1; G.airT=0; G.airPass=0; updateArsenal(G.stage,STEP);
    upgradeCannon('air'); updateArsenal(G.stage,STEP);
    const stable=G.airTier===1 && G.aircraft===2;
    G.airT=0; G.airPass=0; updateArsenal(G.stage,STEP);
    return {pass:models.every(Boolean) && stable && G.airTier===2,models};
  })()`);
  check('Higher aircraft grades widen coverage and each pass hits only once', `(() => {
    for(const x of [0,3.8,5.2]) spawn(R,x,-12,200,0);
    G.aircraft=1; G.airTier=1; G.airX=0; G.airPass=.86; G.airT=100; G.airHit=false;
    updateArsenal(G.stage,.02); const scout=R.hp[0]===180 && R.hp[1]===200 && R.hp[2]===200;
    updateArsenal(G.stage,.1); const once=R.hp[0]===180;
    G.aircraft=3; G.airTier=3; G.airPass=.86; G.airHit=false; updateArsenal(G.stage,.02);
    return {pass:scout && once && R.hp[0]===150 && R.hp[1]===170 && R.hp[2]===200,hp:Array.from(R.hp.slice(0,3))};
  })()`);
  check('Equipment survives stage retry', `(() => {
    upgradeCannon('tank'); upgradeCannon('arc'); upgradeCannon('air'); upgradeCannon('rapid');
    enterStage(1); G.power=1; G.weapon=0; G.aircraft=0; G.chassis=0;
    $('rretry').click();
    return {pass:G.chassis===1 && G.weapon===3 && G.aircraft===1 && G.rate===2 && G.power===2 && G.shield===3};
  })()`);
  check('Inherited firepower prices supplies once and retries preserve the price', `(() => {
    upgradeCannon('tank'); upgradeCannon('rapid');
    enterStage(1);
    const supply=G.stage.gates.find(g=>g.def.t==='upgrade'), price=supply.need;
    const scaled=price>supply.def.need;
    upgradeCannon('power'); const fixed=supply.need===price;
    $('rretry').click();
    const retried=G.stage.gates.find(g=>g.def.t==='upgrade');
    return {pass:scaled && fixed && retried.need===price && retried.prog===0,price,retry:retried.need};
  })()`);
  check('Armored enemies resist gunfire and burning while railguns pierce the shell', `(() => {
    const shield=spawnRed(0,-6,3,100), crab=spawnRed(2,-6,8,100);
    hitArmedRed(shield,10,WEAPON_SPECS[1],10);
    hitArmedRed(crab,10,WEAPON_SPECS[6],10);
    const protectedHits=Math.abs(R.hp[shield]-94)<.001 && Math.abs(R.hp[crab]-96.5)<.001;
    const burn=R.burnDamage[crab];
    hitArmedRed(shield,10,WEAPON_SPECS[5],10);
    return {pass:protectedHits && Math.abs(burn-.315)<.001 && Math.abs(R.hp[shield]-84)<.001};
  })()`);
  check('Air strikes respect enemy armor', `(() => {
    const j=spawnRed(0,-6,8,100);
    G.aircraft=1; G.airTier=1; G.airPass=.86; G.airHit=false; G.airX=0; G.armyAvg=0;
    updateArsenal(G.stage,.02);
    return {pass:Math.abs(R.hp[j]-93)<.001,hp:R.hp[j]};
  })()`);
  check('Campaign unlocks one world at a time and preserves legacy wins', `(() => {
    const fresh=campaignProgress([],LEVELS.length), first=campaignProgress([3],LEVELS.length), legacy=campaignProgress([0,0,0,2],LEVELS.length);
    const veteran=campaignProgress(Array(20).fill(3),LEVELS.length);
    return {pass:fresh.unlocked===0 && first.unlocked===1 && legacy.unlocked===4 && veteran.unlocked===20};
  })()`);
  check('Map locks block play and unlocked islands launch their level', `(() => {
    const saved=progress;
    try {
      progress={stars:[3]}; showMenu();
      const buttons=[...document.querySelectorAll('.map-stop')];
      buttons[2].click(); const blocked=G.phase==='menu' && !$('worldcard').open; buttons[1].click();
      const card=$('worldcard').open && G.phase==='menu' && $('wc-title').textContent===LEVELS[1].name && $('wc-hard').disabled;
      $('wc-play').click(); const played=G.levelIdx===1 && !G.hardcore && G.lives===10 && !$('worldcard').open;
      showMenu(); document.querySelectorAll('.map-stop')[0].click(); const unlocked=!$('wc-hard').disabled; $('wc-hard').click();
      const hard=G.levelIdx===0 && G.hardcore && G.lives===1;
      return {pass:LEVELS.length===50 && buttons.length===LEVELS.length && buttons.filter(b=>!b.disabled).length===2 && blocked && card && played && unlocked && hard,blocked,card,played,unlocked,hard};
    } finally { progress=saved; }
  })()`);
  check('Victory saves progress before the result animation', `(() => {
    const saved=progress, stored=localStorage.getItem('swarm-progress');
    try {
      progress={stars:[]}; startLevel(0,2); G.lives=9; bossDefeated(G.stage);
      const stars=JSON.parse(localStorage.getItem('swarm-progress')).stars;
      return {pass:G.phase==='won' && !G.shown && stars[0]===3 && campaignProgress(stars,20).unlocked===1};
    } finally {
      progress=saved;
      if(stored===null) localStorage.removeItem('swarm-progress'); else localStorage.setItem('swarm-progress',stored);
    }
  })()`);
  check('Restarting during a grouped nuke effect does not crash', `(() => {
    const cloud=M.buildMushroom(); G.root.add(cloud);
    G.effects.push({kind:'mush',mesh:cloud,life:2,max:2,z:-20});
    startLevel(0);
    return {pass:G.phase==='intro' && G.effects.length===0};
  })()`);
  check('New runs clear old army counters, recoil and screen feedback', `(() => {
    G.armyShown=G.armyPrev=1e30; G.pumpT=G.recoil=G.kick=G.cannonPulse=G.dmgT=G.hurtT=1;
    popups[0].life=3; popups[0].el.style.display='block';
    hud.white.classList.add('on'); hud.armybox.classList.add('pump'); hud.lives.classList.add('hit');
    startLevel(0); G.paused=true; renderWorld(0);
    const reset=[G.armyShown,G.armyPrev,G.pumpT,G.recoil,G.kick,G.cannonPulse,G.dmgT,G.hurtT].every(v=>v===0);
    const clear=!hud.white.classList.contains('on') && !hud.armybox.classList.contains('pump') && !hud.lives.classList.contains('hit');
    return {pass:reset && clear && popups.every(p=>p.life===0 && p.el.style.display==='none') && hud.army.textContent==='0'};
  })()`);
  check('Tracer effects reuse a bounded pool and expire cleanly', `(() => {
    const pool=new FX.Tracers(new THREE.Scene(),8);
    for(let k=0;k<20;k++) pool.emit(0,1,0,k+1,1,-10,0xffffff,.2);
    pool.update(.05); const bounded=pool.mesh.count===8 && pool.mesh.instanceMatrix.array.every(Number.isFinite);
    pool.update(1); const expired=pool.mesh.count===0;
    pool.emit(0,0,0,0,0,0,0xffffff,.2); pool.clear();
    pool.mesh.geometry.dispose(); pool.mesh.material.dispose();
    return {pass:bounded && expired && pool.mesh.count===0};
  })()`);
  check('Splash rings reuse one bounded draw and clear on restart', `(() => {
    const pool=new FX.Rings(new THREE.Scene(),8);
    for(let k=0;k<1000;k++) pool.emit(k,0,2,0x80eaff,.2);
    pool.update(.05); const bounded=pool.mesh.count===8 && pool.mesh.instanceMatrix.array.every(Number.isFinite);
    pool.update(1); const expired=pool.mesh.count===0;
    pool.mesh.geometry.dispose(); pool.mesh.material.dispose(); pool.mesh.dispose();
    impactRings.emit(0,0,2,0xffffff,.2); impactRings.update(.01); startLevel(0);
    return {pass:bounded && expired && impactRings.mesh.count===0};
  })()`);
  check('Troop detail and rank forms preserve units, weapons and motion', `(() => {
    camera.position.set(0,20,20); troopPixelScale=1000;
    const far=spawn(B,-2,-60,4,0), near=spawn(B,2,-3,1e14,0);
    B.weapon[far]=8; B.weapon[near]=1; B.phase[far]=.9; B.phase[near]=1.4;
    B.vz[far]=B.vz[near]=-6; B.age[far]=B.age[near]=1; writeBlue();
    const bot=blueForms[0].far, ascended=blueForms[3].near;
    const motion=bot.geometry.attributes.unitMotion.array;
    const others=blueForms.flatMap(f=>[f.near,f.far]).filter(m=>m!==bot&&m!==ascended).every(m=>m.count===0&&!m.visible);
    return {pass:bot.count===1 && ascended.count===1 && others && bot.instanceMatrix.array[14]===-60 && ascended.instanceMatrix.array[14]===-3 && weaponFarMeshes[8].instanceMatrix.array[14]===-60 && weaponMeshes[1].instanceMatrix.array[14]===-3 && Math.abs(motion[0]-.9)<1e-6 && motion[1]===1};
  })()`);
  check('Distant enemy overlays and sleeping motion stay aligned', `(() => {
    camera.position.set(0,20,20); troopPixelScale=1000;
    const far=spawn(R,-2,-60,4,5), near=spawn(R,2,-3,4,2);
    R.st[far]=1; R.vz[near]=6; R.age[far]=R.age[near]=1; writeRed();
    return {pass:redMesh.count===1 && redFarMesh.count===1 && overlaysFar[5].instanceMatrix.array[14]===-60 && overlays[2].instanceMatrix.array[14]===-3 && redFarMesh.geometry.attributes.unitMotion.array[1]===0};
  })()`);
  check('Special enemy kits follow their hovering bodies', `(() => {
    camera.position.set(0,20,20); troopPixelScale=1000;
    for(const kind of [7,8,9]) { const i=spawn(R,kind-8,-3,10,kind); R.age[i]=1; R.phase[i]=0; R.vz[i]=3; }
    halos.begin(); writeRed(); halos.end();
    const heights=[7,8,9].map(kind=>overlays[kind].instanceMatrix.array[13]);
    const motion=redMesh.geometry.attributes.unitMotion.array;
    return {pass:overlays[7].count===1 && overlays[8].count===1 && overlays[9].count===1 && Math.abs(heights[0]-.8)<1e-6 && heights[1]===0 && Math.abs(heights[2]-.22)<1e-6 && motion[1]===0 && motion[5]===0 && redAimY(0)>1.4,heights};
  })()`);
  check('Special enemy lights remain bounded in a large horde', `(() => {
    camera.position.set(0,20,20); troopPixelScale=1000;
    for(let k=0;k<100;k++){const i=spawn(R,0,-3,10,k%2?7:9);R.age[i]=1;}
    halos.begin();writeRed();halos.end();
    return {pass:halos.n<=12 && overlays[7].count===50 && overlays[9].count===50,lights:halos.n};
  })()`);
  check('World labels leave HUD space and target health stays visible', `(() => {
    renderWorld(0);
    const label=makeLabel('ball'), point=new THREE.Vector3(0,.99,0).unproject(camera);
    placeLabel(label,point.x,point.y,point.z,'100'); const blocked=!label.vis;
    point.set(0,0,0).unproject(camera); placeLabel(label,point.x,point.y,point.z,'100');
    const visible=label.vis; label.el.remove();
    return {pass:blocked && visible && $('targetname').textContent.includes(fmtHp(G.stage.tower.hp))};
  })()`);
  check('Boss rendering preserves authored scale and passes the full attack cycle', `(() => {
    startLevel(0,2); G.paused=true; G.phase='play';
    const b=G.stage.boss; b.visualScale.setScalar(1.2); b.flash=0; b.atk=.625;
    b.model.normalizedAttack=true; let capture;
    b.model.animate=(time,attack,state)=>{capture={attack,...state};};
    renderWorld(0);
    const active=b.model.group.scale.x===1.2 && capture.attack===.5 && capture.moving && capture.health===1;
    b.stun=1; renderWorld(0);
    return {pass:active && !capture.moving && capture.stunned,active,capture};
  })()`);
  check('Turrets aim their new barrel and recoil when firing', `(() => {
    const model=M.buildTurret(); model.group.position.set(2,0,-10); G.root.add(model.group);
    const tr={def:{every:1},x:2,z:-10,hp:100,max:100,timer:0,model,alive:true,flash:0,label:makeLabel('spawner')};
    G.stage.turrets.push(tr); const i=spawn(B,0,-5,10,0);
    updateObstacles(G.stage,.01); model.muzzle.getWorldPosition(defenseMuzzle);
    const fired=tr.firedAt===G.t && Math.abs(model.head.rotation.y-Math.atan2(-2,5))<1e-8 && B.hp[i]<10;
    const recoil=model.group.getObjectByName('turret-recoil').position.z;
    G.t+=1; model.animate(G.t,defensePose(tr));
    return {pass:fired && recoil<.37 && model.group.getObjectByName('turret-recoil').position.z===.37 && defenseMuzzle.y>0 && defenseMuzzle.z>-10,fired,recoil};
  })()`);
  check('Tall bosses fit beneath the HUD at the start of combat', `(() => {
    startLevel(19,2); G.paused=true; G.phase='play'; G.kick=G.shake=0; renderWorld(0);
    const b=G.stage.boss;
    tmpV.set(b.x,b.model.height+.35,b.z+b.model.radius).project(camera);
    const top=(-tmpV.y*.5+.5)*innerHeight;
    return {pass:top>=labelTop+11,top,hud:labelTop,fov:camera.fov};
  })()`);
  check('Pause clears held input and resume preserves the battle', `(() => {
    G.paused=false; keys.left=true; drag={id:1,x:0,aim:0};
    const i=spawn(B,0,-3,10,0); G.time=7; upgradeCannon('tank');
    const opened=pauseGame() && $('pause').open && G.paused && sound.paused && !keys.left && drag===null;
    resumeGame();
    return {pass:opened && !$('pause').open && !G.paused && !sound.paused && G.time===7 && B.hp[i]===10 && G.chassis===1};
  })()`);
  check('Returning to the map keeps a resumable run', `(() => {
    G.paused=false; G.time=13; const i=spawn(B,1,-8,42,0); upgradeCannon('rockets');
    pauseGame(); $('pausemap').click();
    const saved=G.phase==='menu' && G.resumePhase==='play' && !$('pause').open && $('mapresume').textContent.includes('Resume');
    $('mapresume').click();
    return {pass:saved && G.phase==='play' && !G.paused && G.resumePhase===null && G.time===13 && B.hp[i]===42 && G.weapon===2};
  })()`);
  check('Loss of window focus pauses active play', `(() => {
    G.paused=false; keys.right=true;
    window.dispatchEvent(new Event('blur'));
    const paused=G.paused && $('pause').open && !keys.right;
    resumeGame(); return {pass:paused};
  })()`);
  check('Audio preferences remain usable when browser storage is blocked', `(() => {
    const original=Object.getOwnPropertyDescriptor(window,'localStorage');
    try {
      Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage is disabled','SecurityError');}});
      const unavailable=new Sound(); const memory=!unavailable.muted && unavailable.toggle() && !unavailable.toggle();
      Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:()=> '1',setItem(){throw new DOMException('Storage is full','QuotaExceededError');}}});
      const full=new Sound(); const toggles=full.muted && !full.toggle() && full.toggle();
      return {pass:memory && toggles};
    } finally { Object.defineProperty(window,'localStorage',original); }
  })()`);
  check('Flanking reinforcements wait for their warning and use bounded power', `(() => {
    G.armyAvg=1e30;
    scheduleFlank(G.stage,{kind:4,count:3,warning:1.4,firstSide:0});
    updateEffects(1); const waiting=R.n===0;
    updateEffects(.5);
    return {pass:waiting && R.n===3 && R.kind[0]===4 && R.hp[0]<100 && G.stage.flankN===1};
  })()`);
  check('A cleared stage cancels pending flanking reinforcements', `(() => {
    scheduleFlank(G.stage,{kind:4,count:3,warning:1.4,firstSide:0});
    G.phase='clear'; updateEffects(2);
    return {pass:R.n===0};
  })()`);
  check('Optional prizes cannot be collected by bypassing an intact seal', `(() => {
    startLevel(3); G.paused=true; G.phase='play'; G.bot=null; B.n=R.n=0;
    const S=G.stage, prize=S.gates.find(g=>g.def.requires), seal=prize.seal;
    const passPrize=()=>{
      B.n=R.n=0; G.t=0; prize.x=seal.x;
      const i=spawn(B,prize.x,prize.z+.6,1,0); B.vz[i]=-9;
      buildCoarse(cR,R); buildGrid(gB,B); updateMechanics(S,0); moveBlue(S,.1);
      let power=0; for(let j=0;j<B.n;j++)power+=B.hp[j]; return power;
    };
    const blocked=passPrize()===1 && prize.locked && !prize.on;
    seal.alive=false; const rewarded=passPrize()>1;
    return {pass:blocked && rewarded && !prize.locked};
  })()`);
  check('A sealed route resets after retry and a normal route remains available', `(() => {
    startLevel(3); G.paused=true;
    const seal=G.stage.gates.find(g=>g.def.vault); seal.alive=false;
    updateMechanics(G.stage,0); const opened=G.stage.gates.filter(g=>g.def.requires).every(g=>!g.locked);
    $('rretry').click(); G.paused=true;
    const reset=G.stage.gates.filter(g=>g.def.requires).every(g=>g.locked && !g.on);
    return {pass:opened && reset && G.stage.gates.some(g=>g.def.t==='mul'&&!g.def.requires)};
  })()`);
  check('Storm clouds stay outside the road camera corridor', `(() => {
    startLevel(18); const clouds=G.root.getObjectByName('storm-cloud-banks');
    if(!clouds) return {pass:false};
    clouds.geometry.computeBoundingBox(); const transform=new THREE.Matrix4();
    let clear=true;
    for(let i=0;i<clouds.count;i++) {
      clouds.getMatrixAt(i,transform);
      const bounds=clouds.geometry.boundingBox.clone().applyMatrix4(transform);
      if(bounds.min.x<10 && bounds.max.x>-10) clear=false;
    }
    return {pass:clear,count:clouds.count};
  })()`);
  const late=(idx,stage=0)=>`startLevel(${idx},${stage}); G.paused=true; G.phase='play'; G.bot=null; B.n=R.n=0; const S=G.stage;`;
  check('Redline traffic earns a hot multiplier, can cool early, and overload divides even star-boosted troops', `(() => { ${late(7,2)}
    const g=S.redline, base=g.def.v;
    g.boost=2;
    const pass=()=>{ B.n=0; const i=spawn(B,g.x,g.z,90,0); applyGate(S,g,i);
      return B.hp.subarray(0,B.n).reduce((sum,hp)=>sum+hp,0); };
    // Many crossings in the same instant must not charge the dial.
    for(let n=0;n<80;n++) pass();
    const cold=g.heat===0 && pass()===90*base*2;
    const stream=(seconds,fire)=>{ for(let n=0;n<Math.round(seconds/STEP);n++) {
      if(fire && n%6===0) pass(); S.time+=STEP; updateMechanics(S,STEP);
    }};
    stream(3.4,true); const peak=g.band===2 && pass()===90*base*6*2;
    stream(2,false); const cooled=g.band>=0 && g.band<2 && g.vent===0;
    stream(6.5,true); const divided=g.vent>0 && pass()===30;
    stream(4.2,false); const recovered=g.vent===0 && g.cur.t==='mul' && g.cur.v===base && g.def.v===base;
    return {pass:cold&&peak&&cooled&&divided&&recovered,cold,peak,cooled,divided,recovered};
  })()`);
  check('Competing armories spend partial deposits, grant one complete kit, and reset together on retry', `(() => { ${late(28,1)}
    const [a,b]=S.gates.filter(g=>g.def.fieldChoice), [win,lose]=a.def.kit?[a,b]:[b,a];
    const partial=spawn(B,lose.x,lose.z,4,0); absorb(S,lose,partial);
    const spent=B.hp[partial]===0 && lose.prog===4 && lose.alive;
    B.n=0;
    const paid=spawn(B,win.x,win.z+.1,win.need+5,0), free=spawn(B,lose.x,lose.z+.1,lose.need+9,0);
    B.vz[paid]=B.vz[free]=-9; buildGrid(gB,B); moveBlue(S,.05);
    const kit=G.twin&&G.rate===2&&G.chassis===0;
    const closed=!win.alive&&!lose.alive&&!lose.model.group.visible&&B.hp[paid]===5&&B.hp[free]===lose.need+9;
    const price=win.need; $('rretry').click(); const pair=G.stage.gates.filter(g=>g.def.fieldChoice);
    return {pass:spent&&kit&&closed&&!G.twin&&G.rate===1&&pair.length===2&&pair.every(g=>g.alive&&g.prog===0)&&pair.find(g=>g.def.kit).need===price,spent,kit,closed};
  })()`);
  check('A link changes actual troop power once, preserves stars, and expires only during play', `(() => { ${late(29,1)}
    const source=S.gates.find(g=>g.def.linkArrow), receiver=S.linkGate, base=receiver.def.v, link=receiver.def.link;
    const i=spawn(B,source.x,source.z,source.need+3,0); absorb(S,source,i);
    receiver.boost=2; const spill=B.hp[i]===3 && source.active;
    B.n=0; applyGate(S,receiver,spawn(B,receiver.x,receiver.z,12,0));
    const total=B.hp.subarray(0,B.n).reduce((sum,n)=>sum+n,0);
    G.phase='clear'; updateMechanics(S,2); const held=receiver.linkLeft===link.seconds;
    G.phase='play'; updateMechanics(S,link.seconds+.01); igniteLink(S,source);
    const baseAgain=receiver.linkSpent&&receiver.linkLeft===0&&receiver.cur.v===base&&receiver.boost===2&&receiver.def.v===base;
    $('rretry').click();
    return {pass:spill&&total===12*base*link.bonus*2&&held&&baseAgain&&!G.stage.linkGate.linkSpent,spill,total,held,baseAgain};
  })()`);
  check('Harvest links require the full sowing quota, and a missed nest cannot light its gate', `(() => { ${late(35)}
    const bank=S.gates.find(g=>g.linkNeed), link=S.linkGate;
    bankDeposit(bank,spawn(B,bank.x,bank.z,bank.linkNeed-1,0)); harvest(S,bank);
    const short=!link.linkSpent;
    bankDeposit(bank,spawn(B,bank.x,bank.z,bank.linkNeed,0)); harvest(S,bank);
    const full=link.linkLeft===link.def.link.seconds;
    startLevel(41); G.phase='play'; const nest=G.stage.eggs.find(e=>e.def.linkArrow);
    hatchEgg(G.stage,nest); const missed=G.stage.linkGate.linkSpent&&G.stage.linkGate.linkLeft===0;
    return {pass:short&&full&&missed,short,full,missed};
  })()`);
  check('A packed troop pool keeps a ripe crop and its link until the field can pay', `(() => { ${late(35)}
    const bank=S.gates.find(g=>g.linkNeed), cap=B.N, ripe=bank.def.ripe;
    try {
      B.N=2;
      for(let k=0;k<2;k++){const i=spawn(B,bank.x,bank.z+.15,10,0); B.vz[i]=-9;}
      bank.stored=40; bank.bankT=ripe-.01;
      updateMechanics(S,.03); buildGrid(gB,B); moveBlue(S,.05);
      const held=bank.bankT===ripe&&bank.stored===40&&!S.linkGate.linkSpent&&B.hp[0]===10&&B.hp[1]===10;
      B.n=1; updateMechanics(S,.03); updateMechanics(S,.03);
      return {pass:held&&B.n===2&&B.hp[1]===40*bank.def.max&&bank.stored===0&&S.linkGate.linkSpent,held};
    } finally {B.N=cap;}
  })()`);
  check('Freight loads at the siding, links on its final payment, then hits the fort exactly once', `(() => { ${late(30)}
    const c=S.carts[0], half=Math.floor(c.need/2), hp=S.tower.hp;
    lateContacts(S,spawn(B,c.x,c.z,half,0));
    for(let n=0;n<240;n++)updateLate(S,STEP);
    const siding=c.d<=c.def.d1+3 && !S.linkGate.linkSpent;
    lateContacts(S,spawn(B,c.x,c.z,c.need-half,0));
    const lit=S.linkGate.linkLeft===S.linkGate.def.link.seconds;
    for(let n=0;n<600;n++)updateLate(S,STEP);
    return {pass:siding&&lit&&!c.alive&&c.uses===0&&Math.abs(S.tower.hp-(hp-S.tower.max*c.def.dmg))<.01,siding,lit};
  })()`);
  check('The final paired cores multiply the same troop through the beam and the linked gate', `(() => { ${late(49,1)}
    const f=S.fusions[0], gate=S.linkGate, raw=gate.def.v;
    for(const core of f.cores) lateContacts(S,spawn(B,core.x,f.z,f.need,0));
    updateLate(S,STEP); const lit=f.active>0 && gate.linkLeft>0;
    B.n=0; const x=f.hi-.8, i=spawn(B,x,f.z-.1,10,0);
    B.pz[i]=f.z+.1; lateContacts(S,i); lateContacts(S,i);
    const once=B.hp[i]===10*f.def.v;
    B.x[i]=gate.x; B.z[i]=gate.z; applyGate(S,gate,i);
    const sum=B.hp.subarray(0,B.n).reduce((s,n)=>s+n,0);
    return {pass:lit&&once&&sum===10*f.def.v*raw*gate.def.link.bonus,lit,once,sum};
  })()`);
  check('Bumpers multiply a troop once and bounce it toward the touched side', `(() => { ${late(20)}
    const b=S.bumpers[0], i=spawn(B,b.x+.3,b.z+.2,10,0);
    lateContacts(S,i); const first=B.hp[i]===10*b.v && B.adur[i]>0 && B.ax1[i]>b.x;
    B.adur[i]=0; B.x[i]=b.x-.3; B.z[i]=b.z+.2; lateContacts(S,i);
    return {pass:first && B.hp[i]===10*b.v && B.ax1[i]<b.x,hp:B.hp[i]};
  })()`);
  check('A charged hypno gate converts crossing enemies, then recharges at a higher cost', `(() => { ${late(25)}
    const g=S.gates.find(q=>q.def.t==='hypno'), need=g.need;
    const i=spawn(B,g.x,g.z+.3,need+5,0); B.vz[i]=-9; buildGrid(gB,B); moveBlue(S,.1);
    const charged=g.active;
    const j=spawn(R,g.x,g.z-.03,20,0); buildCoarse(cR,R); moveRed(S,.1);
    let joined=0; for(let k=0;k<B.n;k++) if(B.hp[k]>0 && Math.abs(B.hp[k]-20*1.5*(g.def.v??2))<1e-9) joined++;
    g.activeT=.001; updateMechanics(S,.01);
    return {pass:charged && R.hp[j]<=0 && joined===1 && !g.active && g.need===Math.round(need*1.8),joined,need:g.need};
  })()`);
  check('Harvest banks store troops and return the multiplied total once', `(() => { ${late(35)}
    const g=S.gates.find(q=>q.def.t==='bank'), max=g.def.max??5;
    const i=spawn(B,g.x,g.z+.3,40,0); B.vz[i]=-9; buildGrid(gB,B); moveBlue(S,.1);
    const stored=B.hp[i]<=0 && g.stored===40 && g.bankT===0;
    g.bankT=(g.def.ripe??7)-.001; updateMechanics(S,.01);
    let power=0; for(let k=0;k<B.n;k++) if(B.hp[k]>0) power+=B.hp[k];
    return {pass:stored && Math.abs(power/(40*max)-1)<1e-6 && g.stored===0 && g.bankT<0 && g.coolUntil>S.time,power};
  })()`);
  check('A filled mine cart blasts the fort once and returns at a higher cost', `(() => { ${late(32,1)}
    const c=S.carts[0], T=S.tower, hp=T.hp, need=c.need, uses=c.uses;
    const i=spawn(B,c.x,c.z,need+5,0); lateContacts(S,i);
    const fed=c.prog===need && B.hp[i]===5;
    c.d=c.def.d2; c.z=S.z0-c.d; updateLate(S,.016);
    return {pass:fed && Math.abs(T.hp-(hp-T.max*(c.def.dmg??.2)))<1e-6 && c.uses===uses-1 && c.need===need*2 && c.cool>0,hp:T.hp};
  })()`);
  check('Smashed eggs release hatchlings and missed eggs hatch enemies', `(() => { ${late(40)}
    const [e,miss]=S.eggs, i=spawn(B,e.x,e.z,e.hp+3,0), n=B.n;
    lateContacts(S,i);
    let hatch=0; for(let k=n;k<B.n;k++) if(Math.abs(B.hp[k]-e.max*.4)<1e-9) hatch++;
    const smashed=!e.alive && B.hp[i]===3 && hatch===(e.def.n??4);
    miss.t=.001; updateLate(S,.01);
    return {pass:smashed && !miss.alive && R.n===(miss.def.n??4),hatch,red:R.n};
  })()`);
  check('Charging both fusion cores opens a beam that multiplies each troop once', `(() => { ${late(45)}
    const f=S.fusions[0], T=S.tower, hp=T.hp, need=f.need;
    for(const c of f.cores){ const i=spawn(B,c.x,f.z,need,0); lateContacts(S,i); }
    const ready=f.cores.every(c=>c.full);
    updateLate(S,.01);
    const fused=f.active>0 && T.hp<hp && f.need===need*2 && f.cores.every(c=>!c.full && c.prog===0);
    const j=spawn(B,(f.lo+f.hi)/2,f.z-.1,10,0); B.pz[j]=f.z+.1; lateContacts(S,j);
    const once=B.hp[j]===10*(f.def.v??3); B.pz[j]=f.z+.1; lateContacts(S,j);
    return {pass:ready && fused && once && B.hp[j]===10*(f.def.v??3),hp:B.hp[j]};
  })()`);
  check('Every late boss runs its full attack cycle without errors', `(() => {
    const failed=[];
    for(let idx=20;idx<LEVELS.length;idx++){
      try {
        ${late('idx',2)} const b=S.boss;
        for(let k=0;k<7;k++){ b.atkN=k; bossAttack(S,b); updateEffects(.7); updateEffects(.7); updateLate(S,.1); }
        if(!b.alive || !Number.isFinite(b.hp)) failed.push(b.type);
      } catch(error) { failed.push(LEVELS[idx].name+': '+error.message); }
    }
    return {pass:failed.length===0,failed};
  })()`);
  check('Late stages resolve every fractional cost before play', `(() => {
    const bad=[];
    for(let idx=20;idx<LEVELS.length;idx++) LEVELS[idx].stages.forEach((s,si)=>{
      const text=JSON.stringify(s);
      if(/"(hp|need)F"/.test(text) || !(s.boss?s.boss.hp>0:s.tower>0)) bad.push((idx+1)+':'+(si+1));
    });
    return {pass:bad.length===0,bad};
  })()`);
  g.start(1); g.pause();
  return results;
};
