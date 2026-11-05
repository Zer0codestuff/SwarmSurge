#!/usr/bin/env python3
"""Per-stage HP tuner for levels 11-20.
usage: tune.py <iterations> [L:S ...]   (default: every stage of levels 11-20)
Plays each stage alone with the smart bot (ONE=1), then rescales the tower/boss HP in
src/levels2.js so the bot clears it in about TARGET seconds."""
import json, re, subprocess, sys, math
from concurrent.futures import ThreadPoolExecutor
SRC = '../src/levels2.js'
TARGET = {11: 30, 12: 32, 13: 34, 14: 36, 15: 38, 16: 40, 17: 42, 18: 44, 19: 46, 20: 48}
BOSS_EXTRA = 1.25   # boss fights run a bit longer

def stage_slots(text):
    """[(level, stage, start, end)] spans of the numeric HP literal for every stage."""
    lv = [m.start() for m in re.finditer(r"^    threat: ", text, re.M)]
    out = []
    for k, a in enumerate(lv):
        b = lv[k + 1] if k + 1 < len(lv) else len(text)
        st = 0
        for m in re.finditer(r"tower: ([0-9.e+]+)|boss: \{ type: '\w+', hp: ([0-9.e+]+)", text[a:b]):
            st += 1
            g = 1 if m.group(1) else 2
            out.append((11 + k, st, a + m.start(g), a + m.end(g), g == 2))
    return out

FULL = '--full' in sys.argv
if FULL: sys.argv.remove('--full')

def run(ls):
    """-> list of ((L, S), {res, t, lives, hp}) for every stage that was decided"""
    L, S = ls
    env = {'JSON': '1', 'PATH': '/usr/bin:/bin'}
    if not FULL: env['ONE'] = '1'
    r = subprocess.run(['timeout', '300', 'node', 'run.mjs', str(L), 'smart', str(S), '400'], capture_output=True, text=True, env=env)
    for line in r.stdout.splitlines():
        if line.startswith('JSON '):
            j = json.loads(line[5:])
            out = [((L, e['stage']), {'res': e['result'], 't': e['t'], 'lives': e['lives']}) for e in j['log']]
            if j['phase'] != 'won' and not (not FULL and j['log']):
                out.append(((L, j['stage']), {'res': 'lost', 't': j['st'], 'lives': j['lives'], 'hp': j['hp']}))
            return out
    return [(ls, None)]

def nice(x):
    e = math.floor(math.log10(x)); m = round(x / 10 ** e, 1)
    return f"{int(m * 10 ** e)}" if e < 6 else f"{m:g}e{e}"

iters = int(sys.argv[1]) if len(sys.argv) > 1 else 1
todo = [tuple(map(int, a.split(':'))) for a in sys.argv[2:]] or [(L, S) for L in range(11, 21) for S in (1, 2, 3)]
for it in range(iters):
    jobs = sorted({(L, 1) for L, S in todo}) if FULL else todo
    with ThreadPoolExecutor(12) as ex: res = {k: v for out in ex.map(run, jobs) for k, v in out}
    if FULL: res = {k: v for k, v in res.items() if k in todo or v is None}
    text = open(SRC).read()
    slots = {(L, S): (a, b, boss) for L, S, a, b, boss in stage_slots(text)}
    edits, nxt = [], []
    for (L, S), r in sorted(res.items()):
        a, b, boss = slots[(L, S)]
        H = float(text[a:b])
        T = TARGET[L] * (BOSS_EXTRA if boss else 1)
        if r is None: print(f'L{L}S{S} no result'); nxt.append((L, S)); continue
        if r['res'] in ('clear', 'won'):
            t = r['t']
            # under ~10 s the clear time is mostly travel time, so it says little about dps: jump harder
            f = (60 if t < 10 else min(6, T / t)) if t < T * 0.7 else (T / t if t > T * 1.4 else 1)
            why = f'cleared {t}s lives={r["lives"]}'
        else:
            t = r['t']; dealt = H - max(0, r['hp'] or 0)
            # a loss with almost no damage is a pressure problem (or bad luck), not an hp problem: leave hp alone
            f = max(0.0005, min(0.9, dealt / max(t, 1) * T / H)) if dealt > H * 0.02 else 1
            why = f'LOST {t}s dealt={dealt / H:.3f}' + ('  <-- PRESSURE, hp kept' if f == 1 else '')
        if FULL and r['res'] == 'lost': nxt += [(L, k) for k in range(S + 1, 4)]
        print(f'L{L}S{S} {"boss " if boss else "tower"} {nice(H):>8} -> {nice(H * f):>8}  x{f:.3g}  ({why})')
        if abs(f - 1) > 0.05:
            edits.append((a, b, nice(H * f))); nxt.append((L, S))
    for a, b, v in sorted(edits, reverse=True): text = text[:a] + v + text[b:]
    open(SRC, 'w').write(text)
    print(f'--- iteration {it + 1}: {len(edits)} edits'); sys.stdout.flush()
    todo = sorted(set(nxt + [k for k in todo if k not in res]))
    if not todo: break
