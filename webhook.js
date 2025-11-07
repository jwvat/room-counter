import { redis, KEY } from "./_redis.js";

export default async function handler(req, res) {
  // Nur POST-Anfragen akzeptieren
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // Ein einfaches Sicherheits-Token im Header prüfen
  // → Nur Anfragen mit korrektem Token dürfen zählen
  const token = req.headers["x-webhook-token"];
  if (!token || token !== process.env.WEBHOOK_TOKEN) {
    return res.status(401).send("Unauthorized");
  }

  // Daten aus der Anfrage lesen (z. B. {"direction":"in","count":1})
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const dir = body.direction;          // "in" = rein, "out" = raus
  const step = Number(body.count ?? 1); // Anzahl der Personen (Standard: 1)

  // Prüfen, ob die Werte gültig sind
  if (!["in", "out"].includes(dir) || !Number.isFinite(step) || step <= 0) {
    return res.status(400).send("Bad Request");
  }

  // Wenn jemand reinkommt → +1, wenn raus → -1
  const delta = dir === "in" ? step : -step;

  // Der folgende Code ändert den Wert sicher in der Datenbank
  // und sorgt dafür, dass der Zähler nie unter 0 fällt
  const newVal = await redis.eval(
    `
    local key=KEYS[1]
    local delta=tonumber(ARGV[1])
    local v=redis.call("GET", key)
    if not v then v=0 else v=tonumber(v) end
    v=v+delta
    if v<0 then v=0 end
    redis.call("SET", key, v)
    return v
    `,
    [KEY],
    [String(delta)]
  );

  // Den neuen Stand zurückgeben
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify({ count: Number(newVal) }));
}
