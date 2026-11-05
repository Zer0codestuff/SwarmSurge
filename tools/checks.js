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
  check('Plasma reaches the wider splash radius and respects cover', `(() => {
    for(const [x,z] of [[0,-5],[2,-6],[-2,-6]]) spawn(R,x,z,100,0);
    G.stage.gates.push({alive:true,def:{t:'barrier'},x:-1,z:-5.5,w:.6});
    const i=spawn(B,0,-3,10,0); B.weapon[i]=8; B.shot[i]=0;
    buildGrid(gR,R); updateArsenal(G.stage,1);
    return {pass:R.hp[0]<100 && R.hp[1]<100 && R.hp[2]===100,hp:Array.from(R.hp.slice(0,3))};
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
  check('Equipment survives stage retry', `(() => {
    upgradeCannon('tank'); upgradeCannon('arc'); upgradeCannon('air'); upgradeCannon('rapid');
    enterStage(1); G.power=1; G.weapon=0; G.aircraft=0; G.chassis=0;
    $('rretry').click();
    return {pass:G.chassis===1 && G.weapon===3 && G.aircraft===1 && G.rate===2 && G.power===2 && G.shield===3};
  })()`);
  check('Campaign unlocks one world at a time and preserves legacy wins', `(() => {
    const fresh=campaignProgress([],20), first=campaignProgress([3],20), legacy=campaignProgress([0,0,0,2],20);
    return {pass:fresh.unlocked===0 && first.unlocked===1 && legacy.unlocked===4};
  })()`);
  check('Map locks block play and unlocked islands launch their level', `(() => {
    const saved=progress;
    try {
      progress={stars:[3]}; showMenu();
      const buttons=[...document.querySelectorAll('.map-stop')];
      buttons[2].click(); const blocked=G.phase==='menu'; buttons[1].click();
      return {pass:buttons.length===20 && buttons.filter(b=>!b.disabled).length===2 && blocked && G.levelIdx===1};
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
  check('Troop detail packing preserves units, weapons and motion', `(() => {
    camera.position.set(0,20,20); troopPixelScale=1000;
    const far=spawn(B,-2,-60,4,0), near=spawn(B,2,-3,16,0);
    B.weapon[far]=8; B.weapon[near]=1; B.phase[far]=.9; B.phase[near]=1.4;
    B.vz[far]=B.vz[near]=-6; B.age[far]=B.age[near]=1; writeBlue();
    const farMatrix=blueFarMesh.instanceMatrix.array, nearMatrix=blueMesh.instanceMatrix.array;
    const motion=blueFarMesh.geometry.attributes.unitMotion.array;
    return {pass:blueMesh.count===1 && blueFarMesh.count===1 && farMatrix[14]===-60 && nearMatrix[14]===-3 && weaponMeshes[8].instanceMatrix.array[14]===-60 && weaponMeshes[1].instanceMatrix.array[14]===-3 && Math.abs(motion[0]-.9)<1e-6 && motion[1]===1};
  })()`);
  check('Distant enemy overlays and sleeping motion stay aligned', `(() => {
    camera.position.set(0,20,20); troopPixelScale=1000;
    const far=spawn(R,-2,-60,4,5), near=spawn(R,2,-3,4,2);
    R.st[far]=1; R.vz[near]=6; R.age[far]=R.age[near]=1; writeRed();
    return {pass:redMesh.count===1 && redFarMesh.count===1 && overlays[5].instanceMatrix.array[14]===-60 && overlays[2].instanceMatrix.array[14]===-3 && redFarMesh.geometry.attributes.unitMotion.array[1]===0};
  })()`);
  check('World labels leave HUD space and target health stays visible', `(() => {
    renderWorld(0);
    const label=makeLabel('ball'), point=new THREE.Vector3(0,.99,0).unproject(camera);
    placeLabel(label,point.x,point.y,point.z,'100'); const blocked=!label.vis;
    point.set(0,0,0).unproject(camera); placeLabel(label,point.x,point.y,point.z,'100');
    const visible=label.vis; label.el.remove();
    return {pass:blocked && visible && $('targetname').textContent.includes(fmtHp(G.stage.tower.hp))};
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
  g.start(1); g.pause();
  return results;
};
