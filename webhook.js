import { redis, KEY } from "./_redis.js";

export default async function handler(req, res) {
  // Sowohl GET (für Camlytics-URL-Only) als auch POST erlauben
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1) Auth:
  //    - bevorzugt: Header "X-Webhook-Token" (POST-Fall)
  //    - alternativ: Query ?token=DEINSECRET (GET/URL-only)
  const headerToken = req.headers["x-webhook-token"];
  const queryToken = req.query?.token;
  const token = headerToken || queryToken;
  if (!token || token !== process.env.WEBHOOK_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 2) Parameter holen
  //    - aus Query (GET) oder Body (POST)
  let dir, step;
  if (req.method === "GET") {
    dir = (req.query?.dir || "").toLowerCase();               // "in" | "out"
    step = Number(req.query?.count ?? 1);                      // Anzahl
  } else {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    dir = (body.direction || "").toLowerCase();
    step = Number(body.count ?? 1);
  }

  // 3) Validieren
  if (!["in", "out"].includes(dir) || !Number.isFinite(step) || step <= 0) {
    return res.status(400).json({ error: "Bad Request", hint: "Use dir=in|out and count>=1" });
  }

  // 4) Delta berechnen (+ für 'in', - für 'out')
  const delta = dir === "in" ? step : -step;

  try {
    // 5) Atomar in Redis ändern, nie unter 0 fallen lassen
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

    return res.status(200).json({ ok: true, count: Number(newVal) });
  } catch (e) {
    return res.status(500).json({ error: "UPDATE_FAILED", message: String(e?.message || e) });
  }
}
