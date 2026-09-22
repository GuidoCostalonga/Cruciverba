# CruciWord Creator

Pagina pubblicata: https://guidocostalonga.github.io/Cruciverba/

Applicazione web per creare cruciverba su misura: si scelgono le categorie,
la difficoltà e il tipo di schema, il programma incrocia le parole, e poi si
gioca, si chiede un suggerimento, si verifica quello che si è scritto e si
esporta il risultato.

Tutto sta in un solo file, `index.html`: si apre con un doppio clic, senza
installare nulla, senza connessione e senza librerie esterne.

## Che cosa sa fare

| Funzione | Come si usa |
|---|---|
| Creazione guidata in cinque passi | Categorie, difficoltà, tipo di schema, dimensioni, parole personali |
| Schema normale | Definizioni numerate per le orizzontali e per le verticali |
| Schema facilitato | Alcune lettere sono già scritte e sotto la griglia compare l'elenco delle parole da collocare |
| Schema crittografato | Nessuna definizione in chiaro: ogni lettera diventa un numero, si parte da poche lettere regalate e la lettera scoperta si propaga a tutte le caselle con lo stesso numero |
| Compattezza dello schema | Arioso, equilibrato o compatto: dopo le parole di partenza il programma ne aggiunge altre finché lo schema non raggiunge la densità scelta |
| Caselle vuote | Si passa con un comando dallo schema libero, senza caselle nere disegnate, allo schema classico con il fondo nero |
| Parole da collocare | Un comando mostra o nasconde l'elenco delle parole, in qualunque tipo di schema: acceso di partenza in quelli facilitati. L'elenco finisce anche nel documento stampato |
| Suggerimenti | «Suggerisci una lettera» e «Rivela la parola» lavorano sulla parola selezionata |
| Verifica | «Verifica la parola» e «Verifica tutto» segnano in verde le lettere giuste e in rosso quelle sbagliate |
| Parole a caso | «Aggiungi una parola a caso» e «Riempi gli spazi vuoti» incrociano altre parole d'archivio negli spazi ancora liberi |
| Esportazione | HTML (pagina autonoma con schema, definizioni e soluzione), PDF tramite la stampa del navigatore, CSV apribile con un foglio di calcolo |
| Stampa su tre fogli | Primo foglio lo schema da riempire, secondo foglio le definizioni, terzo foglio la soluzione: si consegna lo schema senza consegnare le risposte |

Si scrive con la tastiera: le frecce spostano il cursore, il tasto di ritorno
cancella, la barra spaziatrice passa dalla lettura orizzontale a quella
verticale, il tasto di invio salta alla parola successiva. La griglia si adatta
allo schermo del telefono e la pagina ha un foglio di stile dedicato alla stampa.

## L'archivio delle parole

Dieci categorie, cinquanta parole ciascuna, cinquecento parole in tutto, tutte
con la loro definizione: Friuli Venezia Giulia, Animali, Cucina e tavola,
Natura e paesaggio, Sport e movimento, Musica, arte e spettacolo, Scienza e
tecnica, Comune e vita pubblica, Storia e geografia, Parole di ogni giorno.

Nel quinto passo della creazione guidata si possono aggiungere parole proprie,
una per riga, con la definizione dopo il punto e virgola:

```
ROVEREDO; Il Comune in Piano della pedemontana pordenonese
FOGOLAR; Il focolare friulano che dà il nome ai circoli degli emigranti
```

Le parole personali vengono collocate per prime. Se una non riesce a
incrociarsi, il programma lo dice: non la scarta in silenzio.

## Come è fatto dentro

- Una sola pagina con HTML, CSS e JavaScript insieme, senza dipendenze e senza
  passaggi di compilazione: si può caricare su qualunque server, anche su
  GitHub Pages, copiando il solo `index.html`.
- La composizione dello schema prova più volte a incrociare le parole e tiene
  il tentativo migliore, valutando numero di parole collocate, parole personali
  sistemate, incroci veri e compattezza della griglia.
- Le caselle sono campi di testo veri, quindi la pagina funziona anche con la
  tastiera del telefono e con i lettori di schermo.
- Lo stato della partita vive in memoria: le lettere scritte stanno in una
  mappa indicizzata sulle coordinate assolute, così aggiungere parole allo
  schema non sposta quello che si è già scritto.

## Controlli

```
node controlla.js         # archivio delle parole: doppioni, definizioni, regole di lingua
node collaudo.js          # collaudo completo nel navigatore
node collaudo-stampa.js   # stampa, bordi delle caselle ed elenco delle parole
```

I collaudi nel navigatore si eseguono con `playwright-core` e il Chromium già
presente nell'ambiente: apre la pagina, crea i tre tipi di schema, scrive nelle
caselle, chiede un suggerimento, verifica la soluzione e controlla che la
console non riporti errori.
