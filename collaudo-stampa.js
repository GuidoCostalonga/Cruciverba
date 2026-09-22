const { chromium } = require('playwright-core');
const path = require('path');
const PAGINA = 'file://' + path.join(__dirname, 'index.html');
const C = require('os').tmpdir() + '/';
const esiti = [];
const verifica = (n, ok, extra) => { esiti.push(ok); console.log((ok ? 'OK   ' : 'ERRORE ') + n + (extra ? '  [' + extra + ']' : '')); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{ width:1280, height:1000 } });
  await p.goto(PAGINA);
  await p.waitForSelector('#sceltaCategorie input');
  await p.click('#tutteCategorie');
  for (let i = 0; i < 2; i++) await p.click('#passoAvanti');
  await p.click('label.scelta:has(input[name="tipo"][value="facilitato"])');
  for (let i = 0; i < 2; i++) await p.click('#passoAvanti');
  await p.click('#creaCruciverba');
  await p.waitForSelector('.cella input');

  // il serbatoio parte visibile negli schemi facilitati
  verifica('lo schema facilitato mostra subito le parole da collocare', await p.isVisible('#pannelloSerbatoio'));
  verifica('il comando propone di nasconderle', (await p.textContent('#bSerbatoio')).includes('Nascondi'));
  await p.click('#bSerbatoio');
  verifica('il comando nasconde le parole', !(await p.isVisible('#pannelloSerbatoio')));
  await p.click('#bSerbatoio');
  verifica('il comando le rimette', await p.isVisible('#pannelloSerbatoio'));

  // bordi veri sotto il foglio di stile della stampa
  await p.emulateMedia({ media: 'print' });
  const bordi = await p.$eval('.cella:not(.vuota)', e => {
    const s = getComputedStyle(e);
    return { bordo: s.borderTopWidth, colore: s.borderTopColor, ombra: s.boxShadow };
  });
  verifica('in stampa le caselle hanno un bordo vero', bordi.bordo === '1px', 'bordo=' + bordi.bordo + ' ombra=' + bordi.ombra);
  const elenco = await p.$eval('.elenco ol', e => getComputedStyle(e).maxHeight);
  verifica('in stampa le definizioni non sono tagliate', elenco === 'none', 'altezza massima=' + elenco);
  await p.locator('.tavolo').screenshot({ path: C + 'stampa-schermo.png' });
  await p.emulateMedia({ media: 'screen' });

  // documento esportato con le parole da collocare
  const doc = await p.evaluate(() => costruisciDocumento(false));
  verifica('il documento esportato elenca le parole da collocare', /Parole da collocare/.test(doc));
  const altra = await b.newPage({ viewport:{ width:1000, height:1400 } });
  await altra.setContent(doc);
  await altra.screenshot({ path: C + 'stampa-documento.png', fullPage: true });

  // schema normale: parte senza elenco, ma si può accendere
  const q = await b.newPage();
  await q.goto(PAGINA);
  await q.waitForSelector('#sceltaCategorie input');
  await q.click('#tutteCategorie');
  for (let i = 0; i < 4; i++) await q.click('#passoAvanti');
  await q.click('#creaCruciverba');
  await q.waitForSelector('.cella input');
  verifica('lo schema normale parte senza elenco delle parole', !(await q.isVisible('#pannelloSerbatoio')));
  await q.click('#bSerbatoio');
  verifica('anche lo schema normale può mostrare le parole', await q.isVisible('#pannelloSerbatoio'));

  // ogni lato di ogni casella deve risultare disegnato, nella pagina e nel documento
  const controllaContorni = async (pagina, selettorePiena, selettoreGriglia) => pagina.evaluate(([sp, sg]) => {
    const celle = Array.from(document.querySelectorAll(sp));
    const riquadro = celle.map(e => e.getBoundingClientRect());
    const larghezza = (e, lato) => parseFloat(getComputedStyle(e)["border" + lato + "Width"]) || 0;
    const vicina = (rettangolo, dove) => riquadro.findIndex(r =>
      dove === "destra" ? Math.abs(r.left - rettangolo.right) < 2 && Math.abs(r.top - rettangolo.top) < 2
                        : Math.abs(r.top - rettangolo.bottom) < 2 && Math.abs(r.left - rettangolo.left) < 2);
    let scoperte = 0;
    celle.forEach((e, i) => {
      const r = riquadro[i];
      const alto = larghezza(e, "Top") > 0;
      const sinistra = larghezza(e, "Left") > 0;
      const destra = larghezza(e, "Right") > 0 || vicina(r, "destra") >= 0;
      const basso = larghezza(e, "Bottom") > 0 || vicina(r, "sotto") >= 0;
      if(!(alto && sinistra && destra && basso)) scoperte++;
    });
    return { celle: celle.length, scoperte: scoperte, griglia: document.querySelectorAll(sg).length };
  }, [selettorePiena, selettoreGriglia]);

  await p.emulateMedia({ media: 'print' });
  const contorniPagina = await controllaContorni(p, '.cella:not(.vuota)', '.griglia');
  verifica('in stampa nessun contorno resta scoperto nella pagina',
    contorniPagina.celle > 0 && contorniPagina.scoperte === 0,
    contorniPagina.celle + ' caselle, ' + contorniPagina.scoperte + ' scoperte');
  await p.emulateMedia({ media: 'screen' });

  const documento = await b.newPage({ viewport:{ width:1000, height:1400 } });
  await documento.setContent(await p.evaluate(() => costruisciDocumento(false)));
  await documento.emulateMedia({ media: 'print' });
  const contorniDocumento = await controllaContorni(documento, 'table.schema td.piena', 'table.schema');
  verifica('nel documento esportato nessun contorno resta scoperto',
    contorniDocumento.celle > 0 && contorniDocumento.scoperte === 0,
    contorniDocumento.celle + ' caselle, ' + contorniDocumento.scoperte + ' scoperte');
  await documento.screenshot({ path: C + 'contorni-documento.png', fullPage: true });

  // il documento deve uscire su tre fogli: schema, definizioni, soluzione
  const sezioni = await documento.$$eval('.pagina', e => e.map(x => (x.querySelector('h1,h2') || {}).textContent || ''));
  verifica('il documento si divide in schema, definizioni e soluzione',
    sezioni.length === 3 && /Definizioni/.test(sezioni[1]) && /Soluzione/.test(sezioni[2]),
    sezioni.join(' | '));
  const fileStampa = C + 'collaudo-stampa.pdf';
  await documento.pdf({ path: fileStampa, format: 'A4', margin:{ top:'12mm', bottom:'12mm', left:'12mm', right:'12mm' } });
  const pagine = (require('fs').readFileSync(fileStampa, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  verifica('la stampa occupa tre pagine', pagine === 3, pagine + ' pagine');

  await b.close();
  const falliti = esiti.filter(e => !e).length;
  console.log('\nProve superate: ' + (esiti.length - falliti) + ' su ' + esiti.length);
  process.exit(falliti ? 1 : 0);
})().catch(e => { console.error('prova interrotta:', e.message); process.exit(2); });
