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
  check('Rapid doubles the rate and caps at x8', `(() => {
    upgradeCannon('rapid'); const first=G.rate; upgradeCannon('rapid');
    upgradeCannon('rapid'); upgradeCannon('rapid');
    return {pass:first===2 && G.rate===8,first,rate:G.rate};
  })()`);
  check('Tank armor absorbs a rolling ball crash', `(() => {
    upgradeCannon('tank'); addBall(G.stage,G.root,0,-1.4,20,1,0,{dmg:3});
    step(STEP); return {pass:G.lives===10 && G.shield===0,lives:G.lives,shield:G.shield};
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
  g.start(1); g.pause();
  return results;
};
