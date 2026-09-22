#!/usr/bin/env node
/**
 * Controllo dell'archivio delle parole di CruciWord Creator.
 * Uso: node cruciword/controlla.js [percorso di index.html]
 * Verifica che ogni parola sia scritta in sole lettere maiuscole, che non ci
 * siano doppioni, che ogni parola abbia la sua definizione e che le definizioni
 * rispettino le regole di lingua del repository.
 */
const fs = require("fs");
const path = require("path");

const percorso = process.argv[2] || path.join(__dirname, "index.html");
const testo = fs.readFileSync(percorso, "utf8");

const blocco = testo.match(/const ARCHIVIO = \[([\s\S]*?)\n\];/);
if (!blocco) {
  console.error("Non trovo il blocco ARCHIVIO in " + percorso);
  process.exit(1);
}

const ARCHIVIO = eval("[" + blocco[1] + "]");
const errori = [];
const avvisi = [];
const viste = new Map();
let totale = 0;
const lunghezze = {};

for (const gruppo of ARCHIVIO) {
  if (!gruppo.chiave || !gruppo.nome) errori.push("Categoria senza chiave o senza nome.");
  const dentro = new Set();
  for (const voce of gruppo.parole) {
    const [parola, definizione] = voce;
    totale++;
    if (!/^[A-Z]{3,}$/.test(parola)) errori.push(gruppo.nome + ": la parola " + parola + " non è fatta di sole lettere maiuscole oppure è più corta di tre lettere.");
    if (dentro.has(parola)) errori.push(gruppo.nome + ": la parola " + parola + " compare due volte nella stessa categoria.");
    dentro.add(parola);
    if (viste.has(parola)) avvisi.push("La parola " + parola + " compare sia in " + viste.get(parola) + " sia in " + gruppo.nome + ".");
    else viste.set(parola, gruppo.nome);
    if (!definizione || definizione.trim().length < 8) errori.push(gruppo.nome + ": la definizione di " + parola + " manca o è troppo corta.");
    const pulita = String(definizione).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
    if (pulita.indexOf(parola) >= 0) errori.push(gruppo.nome + ": la definizione di " + parola + " contiene la parola stessa.");
    if (/[-–—]/.test(definizione)) errori.push(gruppo.nome + ": la definizione di " + parola + " contiene un trattino.");
    if (/\bed\s+[^e]/i.test(definizione)) errori.push(gruppo.nome + ": in " + parola + " la congiunzione ed precede una parola che non inizia per e.");
    if (/\bad\s+[^a]/i.test(definizione)) errori.push(gruppo.nome + ": in " + parola + " la preposizione ad precede una parola che non inizia per a.");
    lunghezze[parola.length] = (lunghezze[parola.length] || 0) + 1;
  }
}

console.log("Categorie: " + ARCHIVIO.length);
console.log("Parole totali: " + totale + " (" + viste.size + " diverse)");
console.log("Lunghezze: " + Object.keys(lunghezze).sort((a, b) => a - b).map(l => l + " lettere: " + lunghezze[l]).join(", "));
for (const a of avvisi) console.log("Avviso: " + a);
if (errori.length) {
  console.error("\nErrori trovati: " + errori.length);
  for (const e of errori) console.error(" - " + e);
  process.exit(1);
}
console.log("\nNessun errore: l'archivio è in regola.");
