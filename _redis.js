// Wir importieren die Redis-Bibliothek (von Upstash)
import { Redis } from "@upstash/redis";

// Verbindung zur Redis-Datenbank wird automatisch hergestellt
export const redis = Redis.fromEnv();

// Schlüsselname unter dem der aktuelle Zähler gespeichert wird
export const KEY = "room:count";

// Zeitzone für Deutschland, damit der Reset um 08:00 Uhr richtig läuft
export const TZ = "Europe/Berlin";
