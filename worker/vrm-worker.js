/* Basislager 4.0 — Zwischendienst fuer Livewerte und Fragen
   =================================================================
   Warum es diesen Dienst gibt:

   1. Die VRM-Schnittstelle sendet keine CORS-Freigabe. Ein Browser darf
      sie aus einer fremden Seite heraus nicht aufrufen.
   2. Weder das VRM-Token noch der KI-Schluessel duerfen in der
      oeffentlichen Seite stehen.

   Dieser Worker loest beides: Er haelt die Geheimnisse, ruft die Dienste
   auf und gibt nur das Noetige zurueck — mit Freigabe fuer das Bordbuch.

   Einrichtung in Cloudflare:
     Variablen und Geheimnisse
       VRM_TOKEN          (Geheimnis)  das Zugriffstoken aus dem VRM-Portal
       VRM_ANLAGE         (Variable)   Kennung der Anlage, siehe /anlagen
       ERLAUBTE_HERKUNFT  (Variable)   https://hofmannchristoph.github.io
       KI_TOKEN           (Geheimnis)  API-Schluessel von Anthropic
       KI_MODELL          (Variable)   optional, sonst Haiku 4.5
       BUCH_URL           (Variable)   optional, sonst die GitHub-Pages-Adresse
       FRAGEN_PRO_TAG     (Variable)   optional, sonst 200

   Aufrufe:
     /anlagen   listet die Anlagen des Kontos mit ihrer Kennung
     /          liefert die aktuellen Messwerte der eingestellten Anlage
     /frage     POST {frage, verlauf} — beantwortet eine Frage aus dem Bordbuch
   ================================================================= */

const VRM = 'https://vrmapi.victronenergy.com/v2';

/* Der Assistent liest ausschliesslich das veroeffentlichte Bordbuch. So
   gibt es keine zweite Textfassung, die auseinanderlaufen koennte. */
const BUCH_STANDARD = 'https://hofmannchristoph.github.io/Basislager4.0/';
const KI_STANDARD   = 'claude-haiku-4-5-20251001';
const FRAGE_MAX     = 500;    /* Zeichen je Frage */
const VERLAUF_MAX   = 6;      /* Beitraege, die zurueckgereicht werden */

const ANWEISUNG = `Du bist der Assistent im Bordbuch des Wohnmobils "Basislager 4.0",
einem Niesmann + Bischoff Arto 88LE, Modelljahr 2016. Du beantwortest Fragen der
Familie Hofmann zu ihrem eigenen Fahrzeug.

So antwortest du:
- AUSSCHLIESSLICH aus dem Bordbuch weiter unten. Steht etwas nicht drin, sage das
  klar und rate nicht. Erfinde niemals Werte, Tastenfolgen, Mengen oder
  Sicherheitshinweise. Lieber "das steht nicht im Bordbuch" als eine plausible
  Erfindung — es geht um ein echtes Fahrzeug.
- Kurz: zwei bis fuenf Saetze. Bei einem Ablauf eine knappe nummerierte Liste.
- Auf Deutsch, in Schweizer Schreibweise: immer ss, niemals ß.
- Sicherheitsrelevantes gibst du vollstaendig wieder und kuerzt es nicht weg:
  Zuendung und Hubstuetzen, Gas, Gewichte, Ueberlast am Wechselrichter.
- Liegen Livewerte vor und passen zur Frage, beziehe sie ein und nenne sie.
- Du duzt, so wie das Bordbuch es tut.

Zum Schluss jeder Antwort eine eigene letzte Zeile in genau dieser Form:
KAPITEL: kennung1, kennung2
Dort stehen die Kennungen der Kapitel, aus denen die Antwort stammt, hoechstens
drei. Diese Zeile wird dem Leser nicht gezeigt, sondern in antippbare Verweise
umgewandelt. Weisst du kein Kapitel, schreibe KAPITEL: -`;

/* Was das Bordbuch anzeigen soll. Kennungen aus der Diagnose-Antwort
   dieser Anlage. Tanks und Fuehler werden ueber die Instanz zugeordnet,
   weil derselbe Code mehrfach vorkommt. */
const AUSWAHL = {
  'bs':   { name: 'ladestand' },
  'bp':   { name: 'batterieleistung' },
  'bt':   { name: 'restlaufzeit' },
  'bst':  { name: 'batteriezustand' },
  'PVP':  { name: 'solar_jetzt' },
  'YT':   { name: 'solar_heute' },
  'YY':   { name: 'solar_gestern' },
  'tl':   { 24: 'abwasser', 25: 'frischwasser' },
  'tr':   { 24: 'abwasser_menge', 25: 'frischwasser_menge' },
  'tsT':  { 24: 'tiefkuehlfach', 25: 'kuehlschrank', 26: 'wohnraum', 27: 'aussen' },
  'tsH':  { 24: 'tiefkuehlfach_feuchte', 25: 'kuehlschrank_feuchte',
            26: 'wohnraum_feuchte', 27: 'aussen_feuchte' },
  'OP1':  { name: 'ac_abgabe' },
  /* Landstrom-Erkennung: Zustand des MultiPlus und Spannung am
     AC-Eingang. Bulk/Absorption/Float/Passthru heisst am Netz,
     Inverting heisst ohne. */
  'S':    { name: 'vebus_zustand' },
  'IV1':  { name: 'netz_spannung' },
  'IP1':  { name: 'netz_leistung' },
  'AIS':  { name: 'netz_quelle' }
};

function benennen(w) {
  const eintrag = AUSWAHL[w.code];
  if (!eintrag) return null;
  if (eintrag.name) return eintrag.name;
  return eintrag[w.instanz] || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const herkunft = env.ERLAUBTE_HERKUNFT || '*';
    const basis = {
      'Access-Control-Allow-Origin': herkunft,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: basis });

    if (url.pathname.replace(/\/+$/, '') === '/frage') {
      if (request.method !== 'POST') return antwort({ fehler: 'Nur POST' }, 405, basis, false);
      return frageBeantworten(request, env, basis);
    }

    if (request.method !== 'GET') return antwort({ fehler: 'Nur GET' }, 405, basis, false);
    if (!env.VRM_TOKEN) return antwort({ fehler: 'VRM_TOKEN ist nicht gesetzt' }, 500, basis, false);

    /* Genau ein Leerzeichen nach Token — zwei fuehren zu 401. */
    const kopf = {
      'X-Authorization': 'Token ' + String(env.VRM_TOKEN).trim(),
      'Accept': 'application/json'
    };

    try {
      if (url.pathname.replace(/\/+$/, '') === '/anlagen') {
        const ich = await hole(VRM + '/users/me', kopf);
        const id = ichId(ich);
        if (!id) return antwort({ fehler: 'Benutzerkennung nicht gefunden', antwort: ich }, 502, basis, false);
        const liste = await hole(VRM + '/users/' + id + '/installations', kopf);
        const anlagen = (liste.records || []).map(a => ({
          kennung: a.idSite ?? a.id,
          name: a.name ?? a.identifier ?? null
        }));
        return antwort({ benutzer: id, anlagen }, 200, basis, false);
      }

      const anlage = url.searchParams.get('anlage') || env.VRM_ANLAGE;
      if (!anlage) {
        return antwort({ fehler: 'Keine Anlage eingestellt. /anlagen aufrufen und VRM_ANLAGE setzen.' }, 400, basis, false);
      }

      const d = await hole(VRM + '/installations/' + encodeURIComponent(anlage) + '/diagnostics?count=200', kopf);
      const roh = d.records || [];

      let werte = roh.map(r => ({
        code: r.code ?? null,
        beschreibung: r.description ?? null,
        wert: r.formattedValue ?? null,
        roh: r.rawValue ?? null,
        einheit: r.formatValueOnly ?? null,
        geraet: r.Device ?? r.device ?? null,
        instanz: r.instance ?? null,
        zeit: r.timestamp ?? null
      })).filter(w => w.code || w.beschreibung);

      /* Nur die benannten Werte, nie alles: sonst stuenden Seriennummern,
         IP-Adresse und Standort im oeffentlich abrufbaren Ergebnis. Zum
         Nachsehen neuer Kennungen die Vorauswahl voruebergehend erweitern. */
      werte = werte
        .map(w => ({ ...w, name: benennen(w) }))
        .filter(w => w.name)
        .map(w => ({ name: w.name, wert: w.wert, roh: w.roh, zeit: w.zeit }));

      return antwort({
        anlage: String(anlage),
        abgerufen: Math.floor(Date.now() / 1000),
        anzahl: werte.length,
        werte
      }, 200, basis, true);

    } catch (e) {
      return antwort({ fehler: String((e && e.message) || e) }, 502, basis, false);
    }
  }
};

function ichId(o) {
  return o?.user?.id ?? o?.records?.id ?? o?.id ?? o?.idUser ?? null;
}

/* ================================================================
   Fragen ans Bordbuch
   ================================================================ */

async function frageBeantworten(request, env, basis) {
  if (!env.KI_TOKEN) return antwort({ fehler: 'KI_TOKEN ist nicht gesetzt' }, 500, basis, false);

  let eingang;
  try { eingang = await request.json(); }
  catch (e) { return antwort({ fehler: 'Keine gueltige Anfrage' }, 400, basis, false); }

  const frage = String((eingang && eingang.frage) || '').trim().slice(0, FRAGE_MAX);
  if (!frage) return antwort({ fehler: 'Keine Frage uebergeben' }, 400, basis, false);

  if (!(await platzImKontingent(env))) {
    return antwort({ fehler: 'Fuer heute sind genug Fragen beantwortet. Morgen geht es weiter — die Suche funktioniert weiterhin.' },
      429, basis, false);
  }

  try {
    /* Das Buch und die Messwerte parallel holen. Faellt das VRM aus,
       wird die Frage trotzdem beantwortet, nur ohne Livebezug. */
    const [buch, werte] = await Promise.all([
      buchHolen(env),
      livewerteHolen(env).catch(() => null)
    ]);
    if (!buch) return antwort({ fehler: 'Das Bordbuch ist gerade nicht erreichbar' }, 502, basis, false);

    const verlauf = Array.isArray(eingang.verlauf) ? eingang.verlauf.slice(-VERLAUF_MAX) : [];
    const nachrichten = verlauf
      .filter(n => n && n.text)
      .map(n => ({ role: n.rolle === 'ich' ? 'assistant' : 'user', content: String(n.text).slice(0, 2000) }));
    /* Die Abfolge muss mit dem Menschen beginnen. */
    while (nachrichten.length && nachrichten[0].role !== 'user') nachrichten.shift();
    nachrichten.push({ role: 'user', content: frage });

    /* Reihenfolge ist wichtig: Der unveraenderliche Teil steht vorne und
       wird zwischengespeichert, die wechselnden Messwerte danach. Stuenden
       sie davor, waere der Zwischenspeicher bei jeder Frage wertlos. */
    const system = [
      { type: 'text', text: ANWEISUNG },
      { type: 'text', text: 'Das Bordbuch:\n\n' + buch, cache_control: { type: 'ephemeral' } }
    ];
    if (werte && werte.length) {
      system.push({
        type: 'text',
        text: 'Aktuelle Messwerte aus der Anlage, gerade eben abgerufen:\n' +
              werte.map(w => '- ' + w.name + ': ' + w.wert).join('\n')
      });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': String(env.KI_TOKEN).trim(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: env.KI_MODELL || KI_STANDARD,
        max_tokens: 700,
        system,
        messages: nachrichten
      })
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return antwort({ fehler: 'Der Assistent antwortet nicht (' + r.status + ')',
                       hinweis: text.slice(0, 200) }, 502, basis, false);
    }

    const d = await r.json();
    const roh = (d.content || []).filter(t => t.type === 'text').map(t => t.text).join('\n').trim();

    /* Die Kapitelzeile abtrennen — sie wird zu antippbaren Verweisen. */
    let text = roh, kapitel = [];
    const m = roh.match(/\n?KAPITEL:\s*([^\n]*)\s*$/);
    if (m) {
      text = roh.slice(0, m.index).trim();
      kapitel = m[1].split(',').map(x => x.trim().replace(/^#/, '')).filter(x => x && x !== '-');
    }

    return antwort({ antwort: text, kapitel: kapitel.slice(0, 3) }, 200, basis, false);

  } catch (e) {
    return antwort({ fehler: String((e && e.message) || e) }, 502, basis, false);
  }
}

/* Das veroeffentlichte Bordbuch als reinen Text. Es wird direkt von der
   Seite gelesen, damit es keine zweite Fassung gibt, die veraltet. Der
   abgeloeste Text liegt eine Viertelstunde im Zwischenspeicher. */
async function buchHolen(env) {
  const schluessel = new Request('https://buch.intern/text');
  const speicher = caches.default;
  const treffer = await speicher.match(schluessel);
  if (treffer) return treffer.text();

  const r = await fetch(env.BUCH_URL || BUCH_STANDARD, { cf: { cacheTtl: 900 } });
  if (!r.ok) return null;
  const text = alsText(await r.text());
  if (!text) return null;
  await speicher.put(schluessel, new Response(text, {
    headers: { 'Cache-Control': 'max-age=900', 'Content-Type': 'text/plain; charset=utf-8' }
  }));
  return text;
}

/* Aus dem HTML wird eine Gliederung mit den Kapitelkennungen — genau die
   braucht der Assistent, um am Ende auf Kapitel verweisen zu koennen. */
function alsText(html) {
  const teile = [];
  const abschnitt = /<section id="([^"]+)"[\s\S]*?<\/section>/g;
  let m;
  while ((m = abschnitt.exec(html))) {
    const kopf = m[0].match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    const titel = kopf ? entkleiden(kopf[1]) : m[1];
    const rumpf = entkleiden(m[0].replace(/<h2[\s\S]*?<\/h2>/, ''));
    if (rumpf) teile.push('## ' + m[1] + ' — ' + titel + '\n' + rumpf);
  }
  return teile.join('\n\n');
}

function entkleiden(h) {
  return h
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|li|div|h[1-6]|figcaption|summary)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n+ */g, '\n')
    .trim();
}

/* Dieselben Messwerte wie fuer die Kacheln, nur als flache Liste. */
async function livewerteHolen(env) {
  if (!env.VRM_TOKEN || !env.VRM_ANLAGE) return null;
  const kopf = {
    'X-Authorization': 'Token ' + String(env.VRM_TOKEN).trim(),
    'Accept': 'application/json'
  };
  const d = await hole(VRM + '/installations/' + encodeURIComponent(env.VRM_ANLAGE) +
                       '/diagnostics?count=200', kopf);
  return (d.records || [])
    .map(r => ({ code: r.code ?? null, instanz: r.instance ?? null, wert: r.formattedValue ?? null }))
    .map(w => ({ name: benennen(w), wert: w.wert }))
    .filter(w => w.name && w.wert);
}

/* Ausgabenbremse. Der Zaehler liegt im Zwischenspeicher und gilt je
   Rechenzentrum — das ist kein exaktes Limit, sondern eine Bremse gegen
   Dauerfeuer. Die harte Obergrenze gehoert ins Anthropic-Konto. */
async function platzImKontingent(env) {
  const grenze = parseInt(env.FRAGEN_PRO_TAG || '200', 10);
  if (!(grenze > 0)) return true;
  try {
    const tag = new Date().toISOString().slice(0, 10);
    const schluessel = new Request('https://zaehler.intern/frage/' + tag);
    const speicher = caches.default;
    let n = 0;
    const treffer = await speicher.match(schluessel);
    if (treffer) n = parseInt(await treffer.text(), 10) || 0;
    if (n >= grenze) return false;
    await speicher.put(schluessel, new Response(String(n + 1), {
      headers: { 'Cache-Control': 'max-age=86400', 'Content-Type': 'text/plain' }
    }));
    return true;
  } catch (e) {
    return true;   /* Zaehler kaputt: lieber antworten als blockieren */
  }
}

async function hole(u, kopf) {
  const r = await fetch(u, { headers: kopf, cf: { cacheTtl: 30 } });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error('VRM antwortete ' + r.status + (text ? ' — ' + text.slice(0, 180) : ''));
  }
  return r.json();
}

function antwort(daten, status, basis, zwischenspeichern) {
  return new Response(JSON.stringify(daten, null, 2), {
    status,
    headers: {
      ...basis,
      'Content-Type': 'application/json; charset=utf-8',
      /* Kurz zwischenspeichern, damit VRM nicht bei jedem Seitenaufruf
         belastet wird. Fehler nie zwischenspeichern. */
      'Cache-Control': zwischenspeichern ? 'public, max-age=60' : 'no-store'
    }
  });
}
