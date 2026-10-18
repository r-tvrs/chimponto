import { useEffect, useState } from "react";

const TICK_MS = 30_000;

/** O instante atual, renovado a cada 30 s: previsões, "em N min" e a virada do dia acompanham o relógio. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}
