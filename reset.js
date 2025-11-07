import { redis, KEY, TZ } from "./_redis.js";

// Funktion prüft, ob es gerade 08:00 Uhr in Deutschland ist
function isEightClockInBerlin() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(now);
  const h = Number(fmt.find(p => p.type === "hour").value);
  const m = Number(fmt.find(p => p.type === "minute").value);
  return h === 8 && m === 0;
}

export default async function handler(req, res) {
  // Nur GET oder POST erlauben
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // Wenn manuell aufgerufen wird (mit Token), darf man auch außerhalb 08:00 resetten
  const token = req.headers["x-webhook-token"];
  const manual = token && token === process.env.WEBHOOK_TOKEN;

  // Wenn Cron den Reset auslöst, prüfen wir, ob wirklich 08:00 Uhr ist
  if (!manual && !isEightClockInBerlin()) {
    return res.status(200).json({ ok: true, skipped: true, reason: "not 08:00 Europe/Berlin" });
  }

  // Zähler in der Datenbank auf 0 setzen
  await redis.set(KEY, 0);

  // Rückmeldung geben
  res.status(200).json({ ok: true, count: 0 });
}
