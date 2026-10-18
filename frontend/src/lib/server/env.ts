import "server-only";

type EnvKey =
  | "SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ORILLA_ENCRYPTION_KEY"
  | "STELLAR_HORIZON_URL"
  | "FUNDER_SECRET";

/** Lee una variable obligatoria en tiempo de ejecución (no en build). */
export function env(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${key}. Revisa frontend/.env.example y el README.`,
    );
  }
  return value;
}

/**
 * `ORILLA_PROD_MODE=true` oculta las herramientas de prueba (p. ej. el botón a Stellar Expert).
 * Sin definir o con cualquier otro valor, se muestran.
 */
export function isProdMode(): boolean {
  return process.env.ORILLA_PROD_MODE === "true";
}
