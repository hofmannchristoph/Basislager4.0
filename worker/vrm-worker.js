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

/* Was das Bordbuch anzeigen soll. Die Kennungen stammen aus der
   Diagnose-Antwort; unbekannte werden still uebergangen. */
const AUSWAHL = [
  'SOC', 'bv/Soc', 'Soc',
  'P', 'bv/P', 'Pdc',
  'V', 'bv/V',
  'PVP', 'PVpower', 'Pdc_pv',
  'T1', 'T2', 'T3',
  'FL1', 'FL2', 'FL3', 'FL4',
  'AC_IN_P', 'AC_OUT_P', 'ACL1In', 'ACL1Out'
];

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
        const gewaehlt = werte.filter(w => AUSWAHL.includes(w.code));
        if (gewaehlt.length) werte = gewaehlt;
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
