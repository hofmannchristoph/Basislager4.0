/* Basislager 4.0 — Bordbuch
   Haelt das Bordbuch im Geraetespeicher, damit es auch ohne Empfang
   vollstaendig lesbar bleibt. Die Videos liegen bei alugha und YouTube
   und brauchen weiterhin Internet — sie werden bewusst nicht gecacht. */

var CACHE = 'bordbuch-v38';
var DATEIEN = [
  'index.html',
  'lesen.html',
  'assets/tokens.css',
  'assets/logo/favicon.svg',
  'pdfjs/pdf.min.js',
  'pdfjs/pdf.worker.min.js',
  'manifest.webmanifest',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  /* Herstelleranleitungen: liegen mit im Speicher, damit sie auch
     auf dem Platz ohne Empfang verfuegbar sind. */
  'anleitungen/E-P-Hydraulics-Levelsystem-Bedienungsanleitung.pdf',
  'anleitungen/MaxxFan-Deluxe-Bedienungsanleitung.pdf',
  'anleitungen/AL-KO-Air-Premium-X2-Bedienungsanleitung.pdf'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(DATEIEN); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(namen){
        return Promise.all(namen.map(function(n){
          if(n !== CACHE) return caches.delete(n);
        }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  if(url.origin !== location.origin) return;   // alugha, YouTube: direkt durchlassen

  /* Die Original-Unterlagen (12 Kapitel, zusammen ueber 100 MB) bewusst
     nie in den Geraetespeicher — immer direkt aus dem Netz. */
  if(url.pathname.indexOf('/anleitungen/original/') >= 0) return;

  /* Aus dem Speicher anzeigen, im Hintergrund auffrischen.
     So ist die Seite sofort da und eine neue Fassung kommt beim naechsten
     Aufruf automatisch an. */
  e.respondWith(
    caches.match(req).then(function(treffer){
      var netz = fetch(req).then(function(antwort){
        if(antwort && antwort.status === 200){
          var kopie = antwort.clone();
          caches.open(CACHE).then(function(c){ c.put(req, kopie); });
        }
        return antwort;
      }).catch(function(){
        return treffer || caches.match('index.html');
      });
      return treffer || netz;
    })
  );
});
