// Testes do Quadro de Jornadas.
// Executar a partir da raiz do repositório:  node --test jornadas/tests/*.test.cjs
// Requer o pacote "playwright" com o Chromium instalado (npm i -D playwright && npx playwright install chromium).
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const quase = (a, b, tol = 1e-6, msg) => assert.ok(Math.abs(a - b) <= tol, msg || `${a} ≠ ${b}`);
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

/** Abre a página num contexto limpo (localStorage vazio) e coleta erros de script. */
async function abrir(hash = '', viewport = { width: 1360, height: 900 }, preparo) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  if (preparo) await ctx.addInitScript(preparo);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) erros.push(m.text()); });
  await page.goto(URL + (hash ? '#' + hash : ''));
  await page.waitForFunction(() => typeof G !== 'undefined' && G);
  return { page, ctx, erros };
}

/* ------------------------------------------------------------------ */
/* Unidades                                                            */
/* ------------------------------------------------------------------ */
test('formatação de horas e durações', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => [fmtDur(440), fmtDur(504), fmtDur(-90), fmtHM(1460), fmtHM(-60), hm('07:30')]);
  assert.deepEqual(r, ['7h20', '8h24', '−1h30', '00:20', '23:00', 450]);
  await ctx.close();
});

test('Páscoa e feriados nacionais móveis', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => ({
    p2025: toISO(pascoa(2025)), p2026: toISO(pascoa(2026)), p2027: toISO(pascoa(2027)),
    paixao2027: feriadosNacionais(2027).find(f => f.nome === 'Sexta-feira da Paixão').data,
    total: feriadosNacionais(2026).length,
    consciencia: feriadosNacionais(2026).some(f => f.data === '2026-11-20'),
  }));
  assert.equal(r.p2025, '2025-04-20');
  assert.equal(r.p2026, '2026-04-05');
  assert.equal(r.p2027, '2027-03-28');
  assert.equal(r.paixao2027, '2027-03-26');
  assert.equal(r.total, 10);
  assert.ok(r.consciencia, '20 de novembro é feriado nacional (Lei 14.759/2023)');
  await ctx.close();
});

test('período noturno de 22h às 5h (art. 73, § 2º)', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => [
    noturnos(22 * 60, 30 * 60), noturnos(20 * 60, 23 * 60), noturnos(4 * 60, 6 * 60), noturnos(8 * 60, 17 * 60),
    noturnos(1440 + 23 * 60, 2880 + 60),
    prorrogacaoNoturna({ ini: 19 * 60, fim: 31 * 60 }), prorrogacaoNoturna({ ini: 23 * 60, fim: 31 * 60 }),
  ]);
  assert.deepEqual(r, [420, 60, 60, 0, 120, 120, 0]);
  await ctx.close();
});

/* ------------------------------------------------------------------ */
/* EC 141/2026: etapas, jornadas e divisores                           */
/* ------------------------------------------------------------------ */
test('etapas da EC 141 por data e semana de corte', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => {
    const f = d => faseData(parseISO(d)).id;
    const sem = inicio => { const st = emBranco(); st.empresa.inicio = inicio; st.empresa.semanas = 3; return horizonte(st).sem.map(x => x.id); };
    return { datas: ['2026-12-15', '2026-12-16', '2027-12-15', '2027-12-16'].map(f), corte42: sem('2026-11-30'), corte40: sem('2027-11-29'), limites: Object.values(FASES).map(x => [x.limite, x.repousos, x.divisor]) };
  });
  assert.deepEqual(r.datas, ['clt44', 'ec42', 'ec42', 'ec40']);
  // ciclo de 30/11/2026: a semana de 14/12 contém 16/12 e já segue a regra nova
  assert.deepEqual(r.corte42, ['clt44', 'clt44', 'ec42']);
  assert.deepEqual(r.corte40, ['ec42', 'ec42', 'ec40']);
  assert.deepEqual(r.limites, [[44, 1, 220], [42, 2, 210], [40, 2, 200]]);
  await ctx.close();
});

test('jornada diária, intervalo e divisor por regime e etapa', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => {
    const P = { intervalo: 60, int12: 'usufruido' };
    const f = (regime, semanal, fase, p = P) => { const e = prepEmp({ regime, semanal }, p, FASES[fase]); return [e.dur, e.brk, e.divisor, e.n]; };
    return {
      x5_44: ['clt44', 'ec42', 'ec40'].map(k => f('5x2', 44, k)),
      x6_44: ['clt44', 'ec42'].map(k => f('6x1', 44, k)),
      x4_44: ['ec42', 'ec40'].map(k => f('4x3', 44, k)),
      x5_36: f('5x2', 36, 'ec40'),
      x6_30: f('6x1', 30, 'ec42'),
      x12: ['clt44', 'ec42', 'ec40'].map(k => f('12x36', 42, k)),
      x12i: f('12x36', 42, 'ec40', { intervalo: 60, int12: 'indenizado' }),
      ex: [intervaloExigido(240, P), intervaloExigido(300, P), intervaloExigido(360, P), intervaloExigido(361, P)],
    };
  });
  assert.deepEqual(r.x5_44, [[528, 60, 220, 5], [504, 60, 210, 5], [480, 60, 200, 5]]); // 8h48 → 8h24 → 8h
  assert.deepEqual(r.x6_44, [[440, 60, 220, 6], [420, 60, 210, 6]]);
  assert.deepEqual(r.x4_44, [[600, 60, 210, 4], [600, 60, 200, 4]]); // 4 dias de 10h (40h)
  assert.deepEqual(r.x5_36, [432, 60, 180, 5], 'contrato menor mantém divisor próprio (mais favorável)');
  assert.deepEqual(r.x6_30, [300, 15, 150, 6]);
  assert.deepEqual(r.x12, [[660, 60, 210, null], [660, 60, 210, null], [660, 60, 200, null]]);
  assert.deepEqual(r.x12i, [720, 0, 200, null]);
  assert.deepEqual(r.ex, [0, 15, 15, 60]);
  await ctx.close();
});

test('distribuição semanal respeita o limite de cada etapa', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => {
    const base = { entrada: '08:00', intervalo: 60, salario: 2100, personalizado: [8, 8, 8, 8, 8, 4, 0], sabado: 4 };
    const h = o => distCalc({ ...base, ...o }).linhas.map(l => l.w);
    return {
      t42: h({ semanal: 42, fase: 'ec42', dias: [1, 1, 1, 1, 1, 0, 0], modo: 'uniforme' }),
      limitado: h({ semanal: 44, fase: 'ec42', dias: [1, 1, 1, 1, 1, 0, 0], modo: 'uniforme' }),
      t40: h({ semanal: 40, fase: 'ec40', dias: [1, 1, 1, 1, 0, 0, 0], modo: 'uniforme' }),
      antigo: h({ semanal: 44, fase: 'clt44', dias: [1, 1, 1, 1, 1, 1, 0], modo: 'sabado' }),
      saida: distCalc({ ...base, semanal: 42, fase: 'ec42', dias: [1, 1, 1, 1, 1, 0, 0], modo: 'uniforme' }).linhas[0].sai,
    };
  });
  assert.deepEqual(r.t42, [504, 504, 504, 504, 504, 0, 0]);
  assert.deepEqual(r.limitado, [504, 504, 504, 504, 504, 0, 0], '44h contratadas viram 42h na 1ª etapa');
  assert.deepEqual(r.t40, [600, 600, 600, 600, 0, 0, 0]);
  assert.deepEqual(r.antigo, [480, 480, 480, 480, 480, 240, 0]);
  assert.equal(r.saida, 8 * 60 + 504 + 60); // 08:00 + 8h24 + 1h = 17:24
  await ctx.close();
});

test('leitura de lista colada (planilha ou ponto e vírgula)', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => lerLista([
    'Nome; Cargo; Regime; Carga; Salário; Turno; Entrada',
    'Maria Silva; Atendente; 6x1; 44; 2.100,50; Manhã',
    'José Lima\tVigia\t12X36\t\t2300\tnoite\t19h',
    'Ana Costa; Caixa; 4x3; 40; R$ 1950; tarde; 25:00',
    'Pedro',
    '; sem nome; 5x2',
    '',
  ].join('\n')));
  assert.equal(r.ok.length, 4);
  assert.deepEqual(r.erros, [6]);
  const [m, j, a, p] = r.ok;
  assert.deepEqual([m.nome, m.cargo, m.regime, m.semanal, m.salario, m.turno], ['Maria Silva', 'Atendente', '6x1', 44, 2100.5, 'manha']);
  assert.deepEqual([j.regime, j.semanal, j.salario, j.turno, j.entrada], ['12x36', 42, 2300, 'noite', '19:00']);
  assert.deepEqual([a.regime, a.semanal, a.salario, a.turno, a.entrada], ['4x3', 40, 1950, 'tarde', '']);
  assert.deepEqual([p.nome, p.regime, p.semanal, p.turno], ['Pedro', '5x2', 42, 'livre'], 'padrão já adequado à EC 141');
  await ctx.close();
});

/* ------------------------------------------------------------------ */
/* Motor de escala: invariantes legais                                 */
/* ------------------------------------------------------------------ */
const INVARIANTES = `
  const P = S.empresa.params, out = [];
  G.emps.forEach((e, i) => {
    const row = G.sched[i];
    let run = 0, maxRun = 0, prev = null, minGap = Infinity, consec12 = false, intervaloCurto = false;
    const domingosOff = [], folgasSemanaEC = [];
    for (let w = 0; w < S.empresa.semanas; w++) if (G.H.sem[w].repousos === 2) folgasSemanaEC.push(row.slice(w * 7, w * 7 + 7).filter(s => !s.w).length);
    row.forEach((sh, d) => {
      if (G.H.days[d].wd === 6) domingosOff.push(!sh.w);
      if (!sh.w) { run = 0; return; }
      run++; maxRun = Math.max(maxRun, run);
      if (prev) { minGap = Math.min(minGap, sh.ini - prev.fim); if (e.regime === '12x36' && prev.d === d - 1) consec12 = true; }
      const real = sh.fim - sh.ini - (sh.bf - sh.bi);
      if (e.regime !== '12x36' && sh.bf - sh.bi < intervaloExigido(real, P)) intervaloCurto = true;
      prev = { ...sh, d };
    });
    const regra = e.domingo === 'quinzenal' ? 2 : +S.empresa.regraDomingo;
    let janelaSemDomingo = false;
    for (let k = 0; k + regra <= domingosOff.length; k++) if (!domingosOff.slice(k, k + regra).some(Boolean)) janelaSemDomingo = true;
    out.push({ nome: e.nome, regime: e.regime, maxRun, minGap, consec12, intervaloCurto, janelaSemDomingo, folgasSemanaEC, dias: row.filter(s => s.w).length });
  });
  return out;`;

test('exemplo: 6x1 vira infração a partir de 16/12/2026, e só ela', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => {
    recalcular();
    const crit = R.pessoas.flatMap(p => p.alertas.filter(a => a.sev === 'crit').map(a => [p.e.regime, a.tipo]));
    const x61 = R.pessoas.find(p => p.e.regime === '6x1').alertas.find(a => a.tipo === 'x61');
    return { fases: G.H.sem.map(f => f.id), crit, x61dias: x61 && x61.dias };
  });
  assert.deepEqual(r.fases, ['clt44', 'clt44', 'ec42', 'ec42']);
  assert.ok(r.crit.length > 0);
  for (const [regime, tipo] of r.crit) {
    assert.equal(regime, '6x1', 'apenas colaboradores em 6x1 têm infração');
    assert.ok(['x61', 'rep2'].includes(tipo), `infração inesperada: ${tipo}`);
  }
  assert.deepEqual(r.x61dias, ['S3', 'S4'], 'infração só nas semanas sob a EC 141');
  await ctx.close();
});

test('escala adequada: dois repousos, DSR, interjornada, intervalos, domingos e 12x36', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(`conv6x1('5x2')(S); recalcular();
    ({ crit: R.pessoas.flatMap(p => p.alertas.filter(a => a.sev === 'crit').map(a => p.e.nome + ': ' + a.tipo)), cob: R.K.cob / R.K.dem, inv: (() => {${INVARIANTES}})() })`);
  assert.deepEqual(r.crit, [], 'sem infrações após converter 6x1 em 5x2');
  for (const x of r.inv) {
    if (x.regime === '12x36') {
      assert.equal(x.consec12, false, `${x.nome}: plantões em dias seguidos`);
      assert.equal(x.dias, 14);
    } else {
      assert.ok(x.maxRun <= 6, `${x.nome}: ${x.maxRun} dias consecutivos`);
      assert.equal(x.intervaloCurto, false, `${x.nome}: intervalo abaixo do mínimo`);
      assert.equal(x.janelaSemDomingo, false, `${x.nome}: sem domingo na periodicidade`);
      assert.ok(x.folgasSemanaEC.every(n => n >= 2), `${x.nome}: semana EC com menos de 2 repousos (${x.folgasSemanaEC})`);
    }
    assert.ok(x.minGap >= 11 * 60, `${x.nome}: interjornada de ${x.minGap} min`);
  }
  assert.ok(r.cob > 0.94, `cobertura de ${(r.cob * 100).toFixed(1)}%`);
  await ctx.close();
});

/* ------------------------------------------------------------------ */
/* Apuração: casos calculados à mão                                    */
/* ------------------------------------------------------------------ */
/** Empresa 24h, sem feriados nacionais, um colaborador; início em 01/03/2027 (1ª etapa, 42h). */
const montar = (colab, extra = {}, params = {}) => `
  S = emBranco();
  S.empresa.nome = 'Teste'; S.empresa.atividade = 'servicos'; S.empresa.regraDomingo = 4;
  S.empresa.nacionais = false; S.empresa.semanas = 2; S.empresa.inicio = '2027-03-01';
  S.empresa.dias = S.empresa.dias.map(() => ({ aberto: true, abre: '00:00', fecha: '00:00', minimo: 1 }));
  Object.assign(S.empresa.params, ${JSON.stringify(params)});
  S.equipe = [Object.assign({ id: 'x1', nome: 'Teste', cargo: 'Vigia', regime: '5x2', semanal: 42, salario: 2100, turno: 'livre', domingo: 'padrao', entrada: '' }, ${JSON.stringify(colab)})];
  Object.assign(S, ${JSON.stringify(extra)});
  recalcular();`;

test('1ª etapa, 5x2 noturno de 8h24: hora ficta, prorrogação, HE e valores', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ entrada: '22:00' }) + `
    const p = R.pessoas[0];
    ({ dias: p.T.dias, real: p.T.real, notR: p.T.notR, notF: p.T.notF, he: p.T.he50 + p.T.he50n, heN: p.T.he50n, s60: p.T.s60, vh: p.vh, heV: p.heV, adNot: p.adNot, folgas: p.sem.map(s => s.folgas), tipos: p.alertas.map(a => a.tipo) })`);
  const he = 2 * (5 * 504 * 8 / 7 - 42 * 60); // 6h por semana geradas só pela hora reduzida
  assert.equal(r.dias, 10);
  assert.deepEqual(r.folgas, [2, 2]);
  assert.equal(r.real, 10 * 504);
  assert.equal(r.notR, 10 * 504, 'toda a jornada é noturna, inclusive a prorrogação após as 5h');
  assert.ok(r.s60 > 0);
  quase(r.notF, 10 * 504 * 8 / 7);
  quase(r.he, he); quase(r.heN, he);
  assert.equal(r.vh, 10); // 2100 / 210
  quase(r.heV, he / 60 * 10 * 1.2 * 1.5, 1e-6, 'HE noturna com adicional na base (OJ 97)');
  quase(r.adNot, (r.notF - r.heN) / 60 * 10 * 0.2);
  assert.ok(['he', 'not', 's60', 'h824'].every(t => r.tipos.includes(t)));
  await ctx.close();
});

test('regra anterior forçada, 6x1 de 44h noturno: excesso semanal de 6h41', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ regime: '6x1', semanal: 44, salario: 2200, entrada: '22:00' }, {}, { faseForcada: 'clt44' }) + `
    const p = R.pessoas[0]; ({ he: p.T.he50 + p.T.he50n, vh: p.vh, crit: p.alertas.filter(a => a.sev === 'crit').length })`);
  quase(r.he, 2 * (6 * 440 * 8 / 7 - 44 * 60));
  assert.equal(r.vh, 10); // 2200 / 220
  assert.equal(r.crit, 0, '6x1 é regular na regra anterior');
  await ctx.close();
});

test('5x2 diurno de 42h: só salário, provisões e encargos', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ entrada: '08:00' }) + `
    const p = R.pessoas[0]; ({ he: p.T.he50 + p.T.he50n, notR: p.T.notR, sal: p.sal, prov: p.prov, total: p.total, crit: p.alertas.filter(a => a.sev === 'crit').length })`);
  const sal = 2100 * 14 / 30, prov = sal * (1 / 12 + 1 / 9);
  assert.equal(r.he, 0);
  assert.equal(r.notR, 0);
  quase(r.sal, sal);
  quase(r.prov, prov, 1e-6, '13º (8,33%) e férias com 1/3 (11,11%)');
  quase(r.total, (sal + prov) * (1 + 0.08 + 0.278));
  assert.equal(r.crit, 0);
  await ctx.close();
});

test('detecta interjornada suprimida, 7º dia e falta do segundo repouso', async () => {
  const { page, ctx } = await abrir();
  // ter 22:00–07:24 por ajuste; qua 08:00 começa 36 minutos depois
  const a = await page.evaluate(montar({ entrada: '08:00' }, { ajustes: { 'x1|2027-03-02': { ini: '22:00' }, 'x1|2027-03-03': { ini: '08:00' } } }) + `
    const p = R.pessoas[0]; ({ interj: p.T.interj, al: p.alertas.find(a => a.tipo === 'interj') })`);
  assert.equal(a.interj, 660 - 36);
  assert.equal(a.al.sev, 'crit');
  assert.match(a.al.base, /art\. 66/);
  const aj = {}; for (let d = 1; d <= 7; d++) aj['x1|2027-03-0' + d] = { ini: '08:00' };
  const b = await page.evaluate(montar({ entrada: '08:00' }, { ajustes: aj }) + `
    const p = R.pessoas[0]; ({ dobra: p.T.dobra, d7: p.alertas.find(a => a.tipo === 'dsr7'), rep: p.alertas.find(a => a.tipo === 'rep2') })`);
  assert.equal(b.dobra, 504);
  assert.equal(b.d7.sev, 'crit');
  assert.match(b.d7.base, /OJ 410/);
  assert.equal(b.rep.sev, 'crit');
  assert.deepEqual(b.rep.dias, ['S1']);
  assert.match(b.rep.base, /EC 141/);
  await ctx.close();
});

test('feriado: folga a mais na semana e dobra quando trabalhado', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ entrada: '08:00' }) + `
    S.empresa.feriados = [{ data: '2027-03-03', nome: 'Feriado local' }]; recalcular();
    const folgas1 = G.sched[0].slice(0, 7).filter(s => !s.w).length, quarta = G.sched[0][2].w;
    S.ajustes = { 'x1|2027-03-03': { ini: '08:00' } }; recalcular();
    const p = R.pessoas[0];
    ({ folgas1, quarta, fer: p.T.fer, ferV: p.ferV, al: p.alertas.find(a => a.tipo === 'fer') })`);
  assert.equal(r.folgas1, 3, 'dois repousos + folga do feriado');
  assert.equal(r.quarta, false, 'o motor dá a folga no feriado');
  assert.equal(r.fer, 504);
  quase(r.ferV, 504 / 60 * 10 * 2);
  assert.match(r.al.base, /Súmula 146/);
  await ctx.close();
});

test('12x36: adicional e prorrogação; média acima de 40h só com intervalo indenizado', async () => {
  const { page, ctx } = await abrir();
  const a = await page.evaluate(montar({ regime: '12x36', entrada: '19:00', salario: 2100 }) + `
    const p = R.pessoas[0]; ({ dias: p.T.dias, he: p.T.he50 + p.T.he50n, s60: p.T.s60, vh: p.vh, tipos: p.alertas.map(a => a.tipo) })`);
  assert.equal(a.dias, 7);
  assert.equal(a.he, 0);
  assert.ok(a.s60 > 0, 'OJ 388');
  assert.equal(a.vh, 10);
  assert.ok(a.tipos.includes('x12'));
  const u = await page.evaluate(montar({ regime: '12x36', entrada: '07:00', salario: 2000 }, {}, { faseForcada: 'ec40' }) + `({ he: R.pessoas[0].T.he50 + R.pessoas[0].T.he50n, lim: R.pessoas[0].alertas.some(a => a.tipo === 'x12lim') })`);
  assert.deepEqual(u, { he: 0, lim: false }, 'usufruído: 38h30 de média, dentro das 40h');
  const i = await page.evaluate(montar({ regime: '12x36', entrada: '07:00', salario: 2000 }, {}, { faseForcada: 'ec40', int12: 'indenizado' }) + `({ he: R.pessoas[0].T.he50 + R.pessoas[0].T.he50n, lim: R.pessoas[0].alertas.find(a => a.tipo === 'x12lim'), intV: R.pessoas[0].intV })`);
  quase(i.he, 7 * 720 - 2 * 40 * 60, 1e-6, '42h de média: 2h por semana acima do limite');
  assert.equal(i.lim.sev, 'warn');
  quase(i.intV, 7 * 1 * 10 * 1.5, 1e-6, 'intervalo indenizado: 1h a 50% por plantão');
  await ctx.close();
});

test('6x1 sob a EC 141: infração, ou atenção se houver regime compensatório coletivo', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ regime: '6x1', semanal: 42 }) + `
    const sem = R.pessoas[0].alertas.find(a => a.tipo === 'x61').sev;
    S.empresa.params.cctFolgas = true; recalcular();
    ({ sem, com: R.pessoas[0].alertas.find(a => a.tipo === 'x61').sev, media: R.pessoas[0].alertas.find(a => a.tipo === 'rep2') })`);
  assert.equal(r.sem, 'crit');
  assert.equal(r.com, 'warn');
  assert.equal(r.media.sev, 'crit', 'mesmo com norma coletiva, a média de 2 repousos é exigida');
  await ctx.close();
});

/* ------------------------------------------------------------------ */
/* Cenários e economia                                                 */
/* ------------------------------------------------------------------ */
test('cenários recomendam alternativa sem infrações e aplicá-la elimina a 6x1', async () => {
  const { page, ctx } = await abrir('cenarios');
  await page.waitForFunction(() => CEN && CEN.linhas.length > 2, null, { timeout: 60000 });
  const r = await page.evaluate(() => {
    const ids = CEN.linhas.map(l => l.id), rec = CEN.linhas.find(l => l.id === CEN.rec), atual = CEN.linhas.find(l => l.id === 'atual');
    const minimo = Math.min(...CEN.linhas.filter(l => !l.ref && !l.soInfo && !l.cct && l.crit === 0).map(l => l.custoEf));
    return { ids, unicos: new Set(ids).size === ids.length, rec: rec && { id: rec.id, crit: rec.crit, custoEf: rec.custoEf }, minimo, atualCrit: atual.crit, eco: economias().map(e => [e.t, Math.round(e.v), !!e.cond]) };
  });
  assert.ok(r.unicos, `ids repetidos: ${r.ids}`);
  assert.ok(r.ids.includes('hoje') && r.ids.includes('5x2') && r.ids.includes('4x3'));
  assert.ok(r.atualCrit > 0, 'manter a 6x1 gera infrações');
  assert.equal(r.rec.crit, 0);
  quase(r.rec.custoEf, r.minimo, 1e-6, 'recomendado é o de menor custo efetivo');
  assert.ok(r.eco.length >= 3);
  assert.ok(!r.eco.some(([t]) => /30 minutos/.test(t)), 'não sugere intervalo de 30 min como economia');
  await page.click('#cen-tabela button.primary[data-ap]');
  await page.waitForFunction(() => location.hash === '#escala');
  const d = await page.evaluate(() => { garantir(); return { seis: S.equipe.filter(e => e.regime === '6x1').length, x61: R.pessoas.some(p => p.alertas.some(a => a.tipo === 'x61' || a.tipo === 'rep2')) }; });
  assert.deepEqual(d, { seis: 0, x61: false });
  await ctx.close();
});

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */
test('gera o relatório em PDF com todas as seções', async () => {
  const { page, ctx, erros } = await abrir('escala');
  await page.click('#btn-pdf');
  await page.waitForSelector('#pdfdlg:not([hidden]) #pdf-ok');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#pdf-ok')]);
  const arq = path.join(os.tmpdir(), 'quadro-teste.pdf');
  await dl.saveAs(arq);
  const buf = fs.readFileSync(arq);
  assert.match(dl.suggestedFilename(), /^jornadas-farmacia-exemplo-24h-ltda-\d{4}-\d{2}-\d{2}\.pdf$/);
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
  const info = await page.evaluate(() => window.__ultimoPDF);
  assert.ok(info.paginas >= 6, `${info.paginas} páginas`);
  assert.deepEqual(info.secoes, ['resumo', 'escala', 'quadro', 'apuracao', 'conformidade', 'cenarios']);
  assert.deepEqual(erros, []);
  fs.unlinkSync(arq);
  await ctx.close();
});

/* ------------------------------------------------------------------ */
/* Fluxo no navegador                                                  */
/* ------------------------------------------------------------------ */
test('fluxo: começar do zero, cadastrar empresa e equipe, gerar e ajustar a escala', async () => {
  const { page, ctx, erros } = await abrir('escala');
  await page.click('[data-comecar]');
  await page.waitForFunction(() => location.hash === '#empresa');
  assert.equal(await page.evaluate(() => S.equipe.length), 0);
  await page.fill('#e-nome', 'Padaria Boa Massa');
  await page.press('#e-nome', 'Tab');
  await page.click('#tabs a[href="#escala"]');
  await page.waitForSelector('#v-escala .vazio');
  await page.click('#v-escala a[href="#equipe"]');
  await page.click('#n-ok');
  assert.match(await page.textContent('#n-msg'), /Informe o nome/);
  for (const [nome, regime] of [['Carlos Souza', '5x2'], ['Beatriz Melo', '4x3'], ['Rui Prado', '5x2']]) {
    await page.fill('#n-nome', nome);
    await page.selectOption('#n-regime', regime);
    await page.fill('#n-salario', '1900');
    await page.press('#n-nome', 'Enter');
    await page.waitForFunction(n => S.equipe.some(e => e.nome === n), nome);
  }
  assert.equal(await page.inputValue('#n-salario'), '1900', 'salário mantido para o próximo cadastro');
  assert.equal(await page.textContent('#id-eq'), '3', 'cabeçalho acompanha o cadastro');
  await page.click('#eq-lote-btn');
  await page.fill('#eq-lote-txt', 'Dora Lins; Confeiteira; 5x2; 42; 2.300,00; manhã\nÉdson Reis; Vigia; 12x36; ; 2100; noite; 19:00');
  await page.click('#eq-lote-ok');
  await page.waitForFunction(() => S.equipe.length === 5);
  assert.equal(await page.locator('#eq-tabela tbody tr').count(), 5);
  await page.click('#eq-gerar');
  await page.waitForSelector('#v-escala table.grade');
  assert.equal(await page.locator('#v-escala table.grade tbody tr').count(), 5);
  assert.match(await page.textContent('#ident'), /Padaria Boa Massa/);
  await page.click('td[data-e="0"][data-d="1"]');
  await page.check('input[name="ed-m"][value="f"]');
  await page.click('#ed-ok');
  await page.waitForFunction(() => document.querySelector('td[data-e="0"][data-d="1"]').textContent.includes('Folga (ajuste)'));
  await page.reload();
  await page.waitForFunction(() => typeof G !== 'undefined' && G);
  const st = await page.evaluate(() => ({ n: S.equipe.length, ex: S.exemplo, nome: S.empresa.nome, aj: Object.keys(S.ajustes).length }));
  assert.deepEqual(st, { n: 5, ex: false, nome: 'Padaria Boa Massa', aj: 1 });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('dados salvos na versão anterior são migrados', async () => {
  const v1 = { v: 1, empresa: { nome: 'Loja Antiga', atividade: 'servicos', inicio: '2026-11-30', semanas: 2, dias: Array.from({ length: 7 }, () => ({ aberto: true, abre: '08:00', fecha: '18:00', minimo: 1 })), picos: [], nacionais: true, feriados: [], feriadoModo: 'domingo', regraDomingo: 7, params: { intervalo: 60, heAdic: 50, heDomAdic: 100, notAdic: 20, fgts: 8, encargos: 27.8, int12: 'usufruido', horarioFixo: true } },
    equipe: [{ id: 'a', nome: 'Zé', cargo: 'Vendedor', regime: '6x1', semanal: 44, salario: 2000, turno: 'livre', domingo: 'padrao' }], distrib: { semanal: 44, dias: [1, 1, 1, 1, 1, 1, 0], modo: 'sabado', sabado: 4, personalizado: [8, 8, 8, 8, 8, 4, 0], entrada: '08:00', intervalo: 60, salario: 2500 }, ajustes: {} };
  const { page, ctx, erros } = await abrir('', undefined, `localStorage.setItem('quadro-jornadas-v1', ${JSON.stringify(JSON.stringify(v1))})`);
  const r = await page.evaluate(() => ({ v: S.v, nome: S.empresa.nome, dom: S.empresa.regraDomingo, prov: S.empresa.params.provisoes, fase: S.distrib.fase, n: S.equipe.length }));
  assert.deepEqual(r, { v: 2, nome: 'Loja Antiga', dom: 4, prov: true, fase: 'ec42', n: 1 });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('todas as abas renderizam sem erros, inclusive em tela de celular', async () => {
  for (const vp of [{ width: 1360, height: 900 }, { width: 390, height: 844 }]) {
    const { page, ctx, erros } = await abrir('', vp);
    for (const v of ['escala', 'cenarios', 'apuracao', 'conformidade', 'empresa', 'equipe', 'distribuicao', 'fundamentos']) {
      await page.evaluate(h => { location.hash = h; }, v);
      await page.waitForSelector(`#v-${v}:not([hidden]) h2`);
      const largura = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(largura <= vp.width, `${v} em ${vp.width}px transborda (${largura}px)`);
    }
    assert.deepEqual(erros, []);
    await ctx.close();
  }
});

test('equipe vazia não quebra cenários, apuração nem conformidade', async () => {
  const { page, ctx, erros } = await abrir();
  const r = await page.evaluate(() => { S = emBranco(); recalcular(); return { p: R.pessoas.length, def: R.K.def === R.K.dem }; });
  assert.deepEqual(r, { p: 0, def: true });
  for (const v of ['escala', 'cenarios', 'apuracao', 'conformidade']) {
    await page.evaluate(h => { location.hash = h; }, v);
    await page.waitForSelector(`#v-${v}:not([hidden]) h2`);
  }
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('regressão: clicar na aba Conformidade não apaga os dados', async () => {
  const { page, ctx } = await abrir('escala');
  const antes = await page.evaluate(() => S.equipe.length);
  await page.click('#tabs a[href="#conformidade"]');
  await page.click('#cnt-alertas');
  await page.waitForSelector('#v-conformidade:not([hidden]) h2');
  assert.equal(await page.evaluate(() => S.equipe.length), antes);
  assert.equal(await page.evaluate(() => location.hash), '#conformidade');
  await ctx.close();
});
