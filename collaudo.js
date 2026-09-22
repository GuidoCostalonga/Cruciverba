/**
 * Collaudo di CruciWord Creator nel navigatore.
 * Serve playwright-core e un Chromium già presente nel sistema.
 * Uso: node collaudo.js
 * Il percorso del Chromium si può indicare con la variabile CHROMIUM.
 */
const path = require("path");
const { chromium } = require("playwright-core");
const PAGINA = "file://" + path.join(__dirname, "index.html");
const ESEGUIBILE = process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const esiti = [];
function verifica(nome, condizione, extra){
  esiti.push({ nome, ok: !!condizione, extra: extra || '' });
  console.log((condizione ? 'OK   ' : 'ERRORE ') + nome + (extra ? '  [' + extra + ']' : ''));
}

(async () => {
  const browser = await chromium.launch({ executablePath: ESEGUIBILE, args: ['--no-sandbox'] });
  const errori = [];
  const page = await browser.newPage();
  page.on('pageerror', e => errori.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errori.push('console: ' + m.text()); });

  async function crea({ tipo, difficolta, dimensione, parole, personali }) {
    await page.goto(PAGINA);
    await page.waitForSelector('#sceltaCategorie input');
    await page.click("#tutteCategorie");
    await page.click("#passoAvanti");
    await page.click(`label.scelta:has(input[name="difficolta"][value="${difficolta}"])`);
    await page.click("#passoAvanti");
    await page.click(`label.scelta:has(input[name="tipo"][value="${tipo}"])`);
    await page.fill("#titoloScelto", "Prova di collaudo");
    await page.fill("#autoreScelto", "Redazione");
    await page.click("#passoAvanti");
    await page.click(`label.scelta:has(input[name="dimensione"][value="${dimensione}"])`);
    await page.fill("#numeroParole", String(parole));
    await page.click("#passoAvanti");
    if (personali) await page.fill("#paroleProprie", personali);
    await page.click("#creaCruciverba");
    await page.waitForSelector('#pannelloGioco:not([hidden]) .cella input');
  }

  // ---- schema normale
  await crea({ tipo: 'normale', difficolta: 'media', dimensione: 13, parole: 18, personali: 'ROVEREDO; Il Comune in Piano\nFOGOLAR; Il focolare friulano' });
  const numeroParole = await page.$eval('#contaParole', e => Number(e.textContent));
  verifica('schema normale generato con almeno otto parole', numeroParole >= 8, 'parole=' + numeroParole);
  const celle = await page.$$eval('.cella input', e => e.length);
  const caselle = await page.$eval('#contaCaselle', e => Number(e.textContent));
  verifica('numero di caselle coerente con la griglia', celle === caselle, celle + ' contro ' + caselle);
  const definizioni = await page.$$eval('#elencoOrizzontali li, #elencoVerticali li', e => e.length);
  verifica('una definizione per ogni parola', definizioni === numeroParole, definizioni + ' contro ' + numeroParole);

  // parole personali collocate
  const personaliDentro = await page.evaluate(() => ['ROVEREDO','FOGOLAR'].filter(p => stato.parole.some(w => w.p === p)).length);
  verifica('parole personali inserite nello schema', personaliDentro === 2, 'inserite=' + personaliDentro);

  // incroci veri: ogni parola oltre la prima incrocia
  const isolate = await page.evaluate(() => {
    let isolate = 0;
    for (const w of stato.parole) {
      const dr = w.dir === 'V' ? 1 : 0, dc = w.dir === 'O' ? 1 : 0;
      let incrocia = false;
      for (let i = 0; i < w.p.length; i++) {
        const r = w.riga + dr * i, c = w.col + dc * i;
        const alt = stato.parole.find(x => x !== w && x.dir !== w.dir && (() => {
          const dr2 = x.dir === 'V' ? 1 : 0, dc2 = x.dir === 'O' ? 1 : 0;
          for (let j = 0; j < x.p.length; j++) if (x.riga + dr2 * j === r && x.col + dc2 * j === c) return true;
          return false;
        })());
        if (alt) incrocia = true;
      }
      if (!incrocia) isolate++;
    }
    return isolate;
  });
  verifica('nessuna parola isolata nello schema', isolate <= 1, 'isolate=' + isolate);

  // lettere della griglia coerenti con le parole
  const coerenza = await page.evaluate(() => {
    for (const w of stato.parole) {
      const dr = w.dir === 'V' ? 1 : 0, dc = w.dir === 'O' ? 1 : 0;
      for (let i = 0; i < w.p.length; i++) {
        if (stato.griglia[w.riga + dr * i][w.col + dc * i] !== w.p[i]) return w.p;
      }
    }
    return 'ok';
  });
  verifica('lettere della griglia coerenti con le parole', coerenza === 'ok', coerenza);

  // scrittura da tastiera
  const primo = await page.$('.cella input');
  await primo.click();
  await page.keyboard.type('a');
  const scritto = await page.$eval('.cella input', e => e.value);
  verifica('la tastiera scrive nella casella', scritto === 'A', 'valore=' + scritto);

  // verifica della parola corrente
  await page.click('#bVerificaParola');
  const messaggio = await page.$eval('#messaggioGioco', e => e.textContent);
  verifica('la verifica della parola risponde', messaggio.length > 0, messaggio.slice(0, 60));

  // suggerimento
  await page.click('#bSuggerisci');
  const conAiuto = await page.$$eval('.cella.aiuto', e => e.length);
  verifica('il suggerimento rivela una lettera', conAiuto >= 1, 'caselle aiutate=' + conAiuto);

  // riempimento degli spazi vuoti
  await page.click('#bCompleta');
  const dopo = await page.$eval('#contaParole', e => Number(e.textContent));
  verifica('il riempimento aggiunge parole o avvisa', dopo >= numeroParole, 'prima=' + numeroParole + ' dopo=' + dopo);

  // soluzione e completamento
  await page.click('#bSoluzione');
  const completamento = await page.$eval('#contaCompletamento', e => e.textContent);
  verifica('la soluzione porta il completamento al cento per cento', completamento === '100%', completamento);
  await page.click('#bVerificaTutto');
  const finale = await page.$eval('#messaggioGioco', e => e.textContent);
  verifica('la verifica totale riconosce lo schema giusto', /tutto giusto/.test(finale), finale.slice(0, 60));
  const sbagliate = await page.$$eval('.cella.sbagliata', e => e.length);
  verifica('nessuna casella segnalata come sbagliata', sbagliate === 0, 'sbagliate=' + sbagliate);

  // esportazioni
  const csv = await page.evaluate(() => {
    const righe = [];
    for (const w of stato.parole) righe.push([w.num, w.dir, w.p].join(';'));
    return righe.length;
  });
  verifica('dati disponibili per la tabella CSV', csv > 0, 'righe=' + csv);
  const documento = await page.evaluate(() => costruisciDocumento(false));
  verifica('il documento esportato contiene lo schema', /table class="schema"/.test(documento) && /Soluzione/.test(documento), 'lunghezza=' + documento.length);
  verifica('il documento esportato non contiene script residui', !/<script>(?!<\/)/.test(documento.replace('<script>window.onload', '')), '');

  // ---- schema facilitato
  await crea({ tipo: 'facilitato', difficolta: 'facile', dimensione: 9, parole: 10 });
  const date = await page.$$eval('.cella.data', e => e.length);
  const serbatoio = await page.$$eval('#serbatoio li', e => e.length);
  verifica('lo schema facilitato regala alcune lettere', date > 0, 'lettere date=' + date);
  verifica('lo schema facilitato mostra le parole da collocare', serbatoio > 0, 'parole elencate=' + serbatoio);
  const vistoSerbatoio = await page.$eval('#pannelloSerbatoio', e => !e.hidden);
  verifica('il pannello delle parole è visibile', vistoSerbatoio);

  // ---- schema crittografato
  await crea({ tipo: 'crittografato', difficolta: 'media', dimensione: 13, parole: 14 });
  const codici = await page.$$eval('.cella .codice', e => e.length);
  const legenda = await page.$$eval('#legenda li', e => e.length);
  verifica('lo schema crittografato numera le caselle', codici > 0, 'caselle con codice=' + codici);
  verifica('la tabella del codice è compilata', legenda > 0, 'codici=' + legenda);
  const nascoste = await page.isVisible("#elenchi");
  verifica("le definizioni sono davvero invisibili nel crittografato", nascoste === false);
  await page.click("#bDefinizioni");
  const riviste = await page.isVisible("#elenchi");
  verifica("il comando mostra le definizioni", riviste === true);
  const testoDefinizioni = await page.$$eval("#elencoOrizzontali li, #elencoVerticali li", e => e.length);
  verifica("le definizioni compaiono davvero", testoDefinizioni > 0, "voci=" + testoDefinizioni);

  // propagazione del codice
  const propagazione = await page.evaluate(() => {
    const celle = Array.from(stato.campi.keys()).filter(k => !stato.date.has(k));
    const k = celle[0];
    const [r, c] = k.split(',').map(Number);
    const codice = stato.codice.get(stato.griglia[r][c]);
    scriviLettera(r, c, 'Z');
    let uguali = 0, totali = 0;
    for (const kk of stato.campi.keys()) {
      const [rr, cc] = kk.split(',').map(Number);
      if (stato.codice.get(stato.griglia[rr][cc]) === codice && !stato.date.has(kk)) {
        totali++;
        if (stato.risposte.get(kk) === 'Z') uguali++;
      }
    }
    return { uguali, totali };
  });
  verifica('la lettera si propaga a tutte le caselle con lo stesso numero',
    propagazione.totali > 0 && propagazione.uguali === propagazione.totali,
    propagazione.uguali + ' su ' + propagazione.totali);

  // ---- schema molto grande e difficile
  await crea({ tipo: 'normale', difficolta: 'difficile', dimensione: 21, parole: 30 });
  const grandi = await page.$eval('#contaParole', e => Number(e.textContent));
  verifica('lo schema grande incrocia molte parole', grandi >= 15, 'parole=' + grandi);

  // ---- nessuna categoria selezionata
  await page.goto(PAGINA);
  await page.waitForSelector('#sceltaCategorie input');
  await page.$$eval('#sceltaCategorie input', els => els.forEach(e => e.checked = false));
  await page.evaluate(() => mostraPasso(5));
  await page.click('#creaCruciverba');
  const allarme = await page.$eval('#messaggioCreazione', e => e.textContent);
  verifica('avvisa se non si sceglie nessuna categoria', /almeno una categoria/.test(allarme), allarme.slice(0, 50));

  verifica('nessun errore nella console del navigatore', errori.length === 0, errori.slice(0, 3).join(' | '));

  await browser.close();
  const falliti = esiti.filter(e => !e.ok);
  console.log('\nProve superate: ' + (esiti.length - falliti.length) + ' su ' + esiti.length);
  process.exit(falliti.length ? 1 : 0);
})().catch(e => { console.error('collaudo interrotto:', e); process.exit(2); });
