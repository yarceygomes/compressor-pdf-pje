// Testes do Quadro de Jornadas.
// Executar a partir da raiz do repositório:  node --test jornadas/tests/
// Requer o pacote "playwright" com o Chromium instalado (npm i -D playwright && npx playwright install chromium).
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

/** Abre a página num contexto limpo (localStorage vazio) e coleta erros de script. */
async function abrir(hash = '', viewport = { width: 1360, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
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
  const r = await page.evaluate(() => [fmtDur(440), fmtDur(480), fmtDur(-90), fmtHM(1460), fmtHM(-60), hm('07:30')]);
  assert.deepEqual(r, ['7h20', '8h', '−1h30', '00:20', '23:00', 450]);
  await ctx.close();
});

test('Páscoa e feriados nacionais móveis', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => ({
    p2025: toISO(pascoa(2025)), p2026: toISO(pascoa(2026)), p2027: toISO(pascoa(2027)),
    paixao2026: feriadosNacionais(2026).find(f => f.nome === 'Sexta-feira da Paixão').data,
    total: feriadosNacionais(2026).length,
    consciencia: feriadosNacionais(2026).some(f => f.data === '2026-11-20'),
  }));
  assert.equal(r.p2025, '2025-04-20');
  assert.equal(r.p2026, '2026-04-05');
  assert.equal(r.p2027, '2027-03-28');
  assert.equal(r.paixao2026, '2026-04-03');
  assert.equal(r.total, 10);
  assert.ok(r.consciencia, '20 de novembro é feriado nacional (Lei 14.759/2023)');
  await ctx.close();
});

test('período noturno de 22h às 5h (art. 73, § 2º)', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => [
    noturnos(22 * 60, 30 * 60),        // 22h–6h: 7h noturnas
    noturnos(20 * 60, 23 * 60),        // 20h–23h: 1h
    noturnos(4 * 60, 6 * 60),          // 4h–6h: 1h
    noturnos(8 * 60, 17 * 60),         // diurno
    noturnos(1440 + 23 * 60, 2880 + 60), // dia seguinte, 23h–1h: 2h
    prorrogacaoNoturna({ ini: 19 * 60, fim: 31 * 60 }), // 19h–7h cobre 22h–5h: 2h prorrogadas
    prorrogacaoNoturna({ ini: 23 * 60, fim: 31 * 60 }), // começa depois das 22h: sem prorrogação
  ]);
  assert.deepEqual(r, [420, 60, 60, 0, 120, 120, 0]);
  await ctx.close();
});

test('jornada diária e intervalo por regime', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => {
    const P = { intervalo: 60, int12: 'usufruido' };
    const f = (regime, semanal, p = P) => { const e = prepEmp({ regime, semanal }, p); return [e.dur, e.brk, e.divisor]; };
    return {
      a: f('6x1', 44), b: f('5x2', 44), c: f('5x2', 40), d: f('6x1', 30), e: f('6x1', 24),
      g: f('12x36', 42), h: f('12x36', 42, { intervalo: 60, int12: 'indenizado' }), i: f('6x1', 44, { intervalo: 30 }),
      ex: [intervaloExigido(240, P), intervaloExigido(300, P), intervaloExigido(360, P), intervaloExigido(361, P)],
    };
  });
  assert.deepEqual(r.a, [440, 60, 220]); // 7h20 + 1h
  assert.deepEqual(r.b, [528, 60, 220]); // 8h48
  assert.deepEqual(r.c, [480, 60, 200]);
  assert.deepEqual(r.d, [300, 15, 150]); // 5h: pausa de 15 min (art. 71, § 1º)
  assert.deepEqual(r.e, [240, 0, 120]);  // até 4h: sem intervalo
  assert.deepEqual(r.g, [660, 60, 210]);
  assert.deepEqual(r.h, [720, 0, 210]);
  assert.deepEqual(r.i, [440, 30, 220]);
  assert.deepEqual(r.ex, [0, 15, 15, 60]);
  await ctx.close();
});

test('distribuição semanal da carga contratual', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => {
    const base = { entrada: '08:00', intervalo: 60, salario: 2200, personalizado: [8, 8, 8, 8, 8, 4, 0], sabado: 4 };
    const h = o => distCalc({ ...base, ...o }).linhas.map(l => l.w);
    const n = distCalc({ ...base, semanal: 44, dias: [1, 1, 1, 1, 1, 1, 0], modo: 'uniforme', entrada: '22:00' });
    return {
      sab: h({ semanal: 44, dias: [1, 1, 1, 1, 1, 1, 0], modo: 'sabado' }),
      cinco: h({ semanal: 44, dias: [1, 1, 1, 1, 1, 0, 0], modo: 'uniforme' }),
      seis: h({ semanal: 44, dias: [1, 1, 1, 1, 1, 1, 0], modo: 'uniforme' }),
      pers: h({ semanal: 44, dias: [1, 1, 1, 1, 1, 1, 0], modo: 'personalizado' }),
      saida: distCalc({ ...base, semanal: 44, dias: [1, 1, 1, 1, 1, 0, 0], modo: 'uniforme' }).linhas[0].sai,
      noturnoComp: Math.round(n.soma),
    };
  });
  assert.deepEqual(r.sab, [480, 480, 480, 480, 480, 240, 0]);
  assert.deepEqual(r.cinco, [528, 528, 528, 528, 528, 0, 0]);
  assert.deepEqual(r.seis, [440, 440, 440, 440, 440, 440, 0]);
  assert.deepEqual(r.pers, [480, 480, 480, 480, 480, 240, 0]);
  assert.equal(r.saida, 8 * 60 + 528 + 60); // 08:00 + 8h48 + 1h = 17:48
  // 22h–6h20 com intervalo: 6 dias × 7h20 reais, das quais as noturnas valem 8/7
  assert.ok(r.noturnoComp > 2640, 'a redução ficta eleva a carga computada acima de 44h');
  await ctx.close();
});

test('leitura de lista colada (planilha ou ponto e vírgula)', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => lerLista([
    'Nome; Cargo; Regime; Carga; Salário; Turno; Entrada',
    'Maria Silva; Atendente; 6x1; 44; 2.100,50; Manhã',
    'José Lima\tVigia\t12X36\t\t2300\tnoite\t19h',
    'Ana Costa; Caixa; 5x2; 40; R$ 1950; tarde; 25:00',
    'Pedro',
    '; sem nome; 6x1',
    '',
  ].join('\n')));
  assert.equal(r.ok.length, 4);
  assert.deepEqual(r.erros, [6]);
  const [m, j, a, p] = r.ok;
  assert.deepEqual([m.nome, m.cargo, m.regime, m.semanal, m.salario, m.turno], ['Maria Silva', 'Atendente', '6x1', 44, 2100.5, 'manha']);
  assert.deepEqual([j.regime, j.semanal, j.salario, j.turno, j.entrada], ['12x36', 42, 2300, 'noite', '19:00']);
  assert.deepEqual([a.regime, a.semanal, a.salario, a.turno, a.entrada], ['5x2', 40, 1950, 'tarde', '']);
  assert.deepEqual([p.nome, p.regime, p.semanal, p.turno], ['Pedro', '6x1', 44, 'livre']);
  await ctx.close();
});

/* ------------------------------------------------------------------ */
/* Motor de escala: invariantes legais sobre o exemplo                 */
/* ------------------------------------------------------------------ */
test('escala do exemplo respeita DSR, interjornada, intervalos e rodízio dominical', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(() => {
    recalcular();
    const P = S.empresa.params, out = [];
    G.emps.forEach((e, i) => {
      const row = G.sched[i];
      let run = 0, maxRun = 0, prev = null, minGap = Infinity, consec12 = false, intervaloCurto = false;
      const domingosOff = [];
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
      out.push({ nome: e.nome, regime: e.regime, maxRun, minGap, consec12, intervaloCurto, janelaSemDomingo, dias: row.filter(s => s.w).length });
    });
    const crit = R.pessoas.flatMap(p => p.alertas.filter(a => a.sev === 'crit').map(a => p.e.nome + ': ' + a.titulo));
    return { out, crit, cobertura: R.K.cob / R.K.dem };
  });
  assert.deepEqual(r.crit, [], 'o exemplo não deve conter infrações críticas');
  for (const x of r.out) {
    if (x.regime === '12x36') {
      assert.equal(x.consec12, false, `${x.nome}: plantões 12x36 em dias seguidos`);
      assert.equal(x.dias, 14, `${x.nome}: 14 plantões em 28 dias`);
    } else {
      assert.ok(x.maxRun <= 6, `${x.nome}: ${x.maxRun} dias consecutivos (OJ 410)`);
      assert.equal(x.intervaloCurto, false, `${x.nome}: intervalo abaixo do mínimo`);
      assert.equal(x.janelaSemDomingo, false, `${x.nome}: sem folga dominical na periodicidade`);
    }
    assert.ok(x.minGap >= 11 * 60, `${x.nome}: interjornada de ${x.minGap} min`);
  }
  assert.ok(r.cobertura > 0.95, `cobertura de ${(r.cobertura * 100).toFixed(1)}%`);
});

/* ------------------------------------------------------------------ */
/* Apuração: casos calculados à mão                                    */
/* ------------------------------------------------------------------ */
/** Empresa 24h, sem feriados, com um único colaborador. */
const montar = (colab, extra = {}) => `
  S = emBranco();
  S.empresa.nome = 'Teste'; S.empresa.atividade = 'servicos'; S.empresa.regraDomingo = 7;
  S.empresa.nacionais = false; S.empresa.semanas = 2; S.empresa.inicio = '2027-03-01';
  S.empresa.dias = S.empresa.dias.map(() => ({ aberto: true, abre: '00:00', fecha: '00:00', minimo: 1 }));
  S.equipe = [Object.assign({ id: 'x1', nome: 'Teste', cargo: 'Vigia', regime: '6x1', semanal: 44, salario: 2200, turno: 'livre', domingo: 'padrao', entrada: '' }, ${JSON.stringify(colab)})];
  Object.assign(S, ${JSON.stringify(extra)});
  recalcular();`;

test('jornada noturna 6x1 44h: hora ficta, prorrogação, HE e valores (2 semanas)', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ entrada: '22:00' }) + `
    const p = R.pessoas[0];
    ({ dias: p.T.dias, real: p.T.real, notR: p.T.notR, notF: p.T.notF, he50: p.T.he50, he50n: p.T.he50n, s60: p.T.s60,
       vh: p.vh, heV: p.heV, adNot: p.adNot, tipos: p.alertas.map(a => a.tipo) })`);
  const he = 2 * (6 * 440 * 8 / 7 - 44 * 60); // excesso semanal gerado pela redução ficta
  assert.equal(r.dias, 12);
  assert.equal(r.real, 12 * 440);
  assert.equal(r.notR, 12 * 440, 'toda a jornada é noturna (inclui a prorrogação após as 5h)');
  assert.ok(r.s60 > 0, 'Súmula 60, II aplicada');
  assert.ok(Math.abs(r.notF - 12 * 440 * 8 / 7) < 1e-6);
  assert.ok(Math.abs(r.he50 + r.he50n - he) < 1e-6, `HE ${r.he50 + r.he50n} ≠ ${he}`);
  assert.ok(Math.abs(r.he50n - he) < 1e-6, 'HE inteiramente noturna');
  assert.equal(r.vh, 10); // 2200 / 220
  assert.ok(Math.abs(r.heV - he / 60 * 10 * 1.2 * 1.5) < 1e-6, 'HE noturna com adicional na base (OJ 97)');
  assert.ok(Math.abs(r.adNot - (r.notF - r.he50n) / 60 * 10 * 0.2) < 1e-6);
  assert.ok(r.tipos.includes('he') && r.tipos.includes('not') && r.tipos.includes('s60'));
  await ctx.close();
});

test('jornada diurna 6x1 44h sem excesso: só salário e encargos', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ entrada: '08:00' }) + `
    const p = R.pessoas[0]; ({ he: p.T.he50 + p.T.he50n, notR: p.T.notR, sal: p.sal, total: p.total, fgts: p.fgts, enc: p.enc, crit: p.alertas.filter(a => a.sev === 'crit').length })`);
  assert.equal(r.he, 0);
  assert.equal(r.notR, 0);
  assert.ok(Math.abs(r.sal - 2200 * 14 / 30) < 1e-6);
  assert.ok(Math.abs(r.fgts - r.sal * 0.08) < 1e-6);
  assert.ok(Math.abs(r.total - r.sal * (1 + 0.08 + 0.278)) < 1e-6);
  assert.equal(r.crit, 0);
  await ctx.close();
});

test('detecta interjornada suprimida e repouso após o 7º dia', async () => {
  const { page, ctx } = await abrir();
  // seg 08:00 (fixo); ter 22:00 por ajuste → qua 08:00 começa 1h40 após a saída das 6h20
  const a = await page.evaluate(montar({ entrada: '08:00' }, { ajustes: { 'x1|2027-03-02': { ini: '22:00' } } }) + `
    const p = R.pessoas[0]; ({ interj: p.T.interj, al: p.alertas.find(a => a.tipo === 'interj') })`);
  assert.equal(a.interj, 660 - 100);
  assert.equal(a.al.sev, 'crit');
  assert.match(a.al.base, /art\. 66/);
  // trabalho nos 7 dias da primeira semana por ajuste manual
  const aj = {}; for (let d = 1; d <= 7; d++) aj['x1|2027-03-0' + d] = { ini: '08:00' };
  const b = await page.evaluate(montar({ entrada: '08:00' }, { ajustes: aj }) + `
    const p = R.pessoas[0]; ({ dobra: p.T.dobra, al: p.alertas.find(a => a.tipo === 'dsr7') })`);
  assert.equal(b.dobra, 440);
  assert.equal(b.al.sev, 'crit');
  assert.match(b.al.base, /OJ 410/);
  await ctx.close();
});

test('feriado: folga adicional na semana e dobra quando trabalhado', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ entrada: '08:00' }, {}) + `
    S.empresa.feriados = [{ data: '2027-03-03', nome: 'Feriado local' }]; recalcular();
    const folgas1 = G.sched[0].slice(0, 7).filter(s => !s.w).length, quarta = G.sched[0][2].w;
    S.ajustes = { 'x1|2027-03-03': { ini: '08:00' } }; recalcular();
    const p = R.pessoas[0];
    ({ folgas1, quarta, fer: p.T.fer, ferV: p.ferV, al: p.alertas.find(a => a.tipo === 'fer'), he: p.T.he50 + p.T.he50n })`);
  assert.equal(r.folgas1, 2, 'DSR + folga do feriado');
  assert.equal(r.quarta, false, 'o motor prefere dar folga no feriado');
  assert.equal(r.fer, 440);
  assert.ok(Math.abs(r.ferV - 440 / 60 * 10 * 2) < 1e-6);
  assert.match(r.al.base, /Súmula 146/);
  await ctx.close();
});

test('12x36 noturno: adicional e prorrogação, sem HE', async () => {
  const { page, ctx } = await abrir();
  const r = await page.evaluate(montar({ regime: '12x36', entrada: '19:00', salario: 2100 }) + `
    const p = R.pessoas[0]; ({ dias: p.T.dias, he: p.T.he50 + p.T.he50n, s60: p.T.s60, vh: p.vh, tipos: p.alertas.map(a => a.tipo) })`);
  assert.equal(r.dias, 7);
  assert.equal(r.he, 0);
  assert.ok(r.s60 > 0, 'OJ 388: horas após as 5h no 12x36 noturno');
  assert.equal(r.vh, 10); // 2100 / 210
  assert.ok(r.tipos.includes('x12'));
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
  // escala vazia orienta o cadastro
  await page.click('#tabs a[href="#escala"]');
  await page.waitForSelector('#v-escala .vazio');
  await page.click('#v-escala a[href="#equipe"]');
  // cadastro rápido
  await page.click('#n-ok');
  assert.match(await page.textContent('#n-msg'), /Informe o nome/);
  for (const [nome, regime] of [['Carlos Souza', '6x1'], ['Beatriz Melo', '5x2'], ['Rui Prado', '6x1']]) {
    await page.fill('#n-nome', nome);
    await page.selectOption('#n-regime', regime);
    await page.fill('#n-salario', '1900');
    await page.press('#n-nome', 'Enter');
    await page.waitForFunction(n => S.equipe.some(e => e.nome === n), nome);
  }
  assert.equal(await page.inputValue('#n-salario'), '1900', 'salário mantido para o próximo cadastro');
  assert.equal(await page.textContent('#id-eq'), '3', 'cabeçalho acompanha o cadastro');
  // lista colada
  await page.click('#eq-lote-btn');
  await page.fill('#eq-lote-txt', 'Dora Lins; Confeiteira; 6x1; 44; 2.300,00; manhã\nÉdson Reis; Vigia; 12x36; ; 2100; noite; 19:00');
  await page.click('#eq-lote-ok');
  await page.waitForFunction(() => S.equipe.length === 5);
  assert.equal(await page.locator('#eq-tabela tbody tr').count(), 5);
  // gerar
  await page.click('#eq-gerar');
  await page.waitForSelector('#v-escala table.grade');
  assert.equal(await page.locator('#v-escala table.grade tbody tr').count(), 5);
  assert.match(await page.textContent('#ident'), /Padaria Boa Massa/);
  // ajustar uma célula para folga
  await page.click('td[data-e="0"][data-d="1"]');
  await page.check('input[name="ed-m"][value="f"]');
  await page.click('#ed-ok');
  await page.waitForFunction(() => document.querySelector('td[data-e="0"][data-d="1"]').textContent.includes('Folga (ajuste)'));
  // persistência
  await page.reload();
  await page.waitForFunction(() => typeof G !== 'undefined' && G);
  const st = await page.evaluate(() => ({ n: S.equipe.length, ex: S.exemplo, nome: S.empresa.nome, aj: Object.keys(S.ajustes).length }));
  assert.deepEqual(st, { n: 5, ex: false, nome: 'Padaria Boa Massa', aj: 1 });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('todas as abas renderizam sem erros, inclusive em tela de celular', async () => {
  for (const vp of [{ width: 1360, height: 900 }, { width: 390, height: 844 }]) {
    const { page, ctx, erros } = await abrir('', vp);
    for (const v of ['escala', 'apuracao', 'conformidade', 'empresa', 'equipe', 'distribuicao', 'fundamentos']) {
      await page.evaluate(h => { location.hash = h; }, v);
      await page.waitForSelector(`#v-${v}:not([hidden]) h2`);
      const largura = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(largura <= vp.width, `${v} em ${vp.width}px transborda (${largura}px)`);
    }
    assert.deepEqual(erros, []);
    await ctx.close();
  }
});

test('equipe vazia não quebra apuração nem conformidade', async () => {
  const { page, ctx, erros } = await abrir();
  const r = await page.evaluate(() => { S = emBranco(); recalcular(); return { p: R.pessoas.length, dem: R.K.dem > 0, def: R.K.def === R.K.dem }; });
  assert.deepEqual(r, { p: 0, dem: true, def: true });
  for (const v of ['escala', 'apuracao', 'conformidade']) {
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
