// Verbindung & Schlüssel einbinden
import { redis, KEY } from "./_redis.js";

export default async function handler(req, res) {
  // Nur GET-Anfragen sind erlaubt, andere Methoden blocken
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

  // Aktuellen Wert aus der Datenbank holen – wenn keiner da ist → 0
  const count = (await redis.get(KEY)) ?? 0;

  // Browser mitteilen, dass die Antwort JSON ist
  res.setHeader("Content-Type", "application/json");

  // Zählerstand als JSON zurückgeben (z. B. {"count":12})
  res.status(200).send(JSON.stringify({ count: Number(count) }));
}
