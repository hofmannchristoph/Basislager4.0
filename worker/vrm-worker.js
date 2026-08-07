/* Basislager 4.0 — Zwischendienst zum VRM-Portal
   =================================================================
   Warum es diesen Dienst gibt:

   1. Die VRM-Schnittstelle sendet keine CORS-Freigabe. Ein Browser darf
      sie aus einer fremden Seite heraus nicht aufrufen.
   2. Das Zugriffstoken darf nicht in der oeffentlichen Seite stehen.

   Dieser Worker loest beides: Er haelt das Token, ruft VRM ab und gibt
   nur das Noetige zurueck — mit Freigabe fuer das Bordbuch.

   Einrichtung in Cloudflare:
     Variablen und Geheimnisse
       VRM_TOKEN          (Geheimnis)  das Zugriffstoken aus dem VRM-Portal
       VRM_ANLAGE         (Variable)   Kennung der Anlage, siehe /anlagen
       ERLAUBTE_HERKUNFT  (Variable)   https://hofmannchristoph.github.io

   Aufrufe:
     /anlagen   listet die Anlagen des Kontos mit ihrer Kennung
     /          liefert die aktuellen Messwerte der eingestellten Anlage
     /?alles=1  wie oben, aber ohne Vorauswahl — zum Nachsehen, was es gibt
   ================================================================= */

const VRM = 'https://vrmapi.victronenergy.com/v2';

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
  'tl':   { 24: 'abwasser', 25: 'frischwasser' },
  'tr':   { 24: 'abwasser_menge', 25: 'frischwasser_menge' },
  'tsT':  { 24: 'tiefkuehlfach', 25: 'kuehlschrank', 26: 'wohnraum', 27: 'aussen' },
  'OP1':  { name: 'ac_abgabe' }
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: basis });
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

      if (!url.searchParams.get('alles')) {
        /* Bewusst kein Rueckfall auf alles: sonst stuenden Seriennummern,
           IP-Adresse und Standort im oeffentlich abrufbaren Ergebnis. */
        werte = werte
          .map(w => ({ ...w, name: benennen(w) }))
          .filter(w => w.name)
          .map(w => ({ name: w.name, wert: w.wert, roh: w.roh, zeit: w.zeit }));
      }

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
