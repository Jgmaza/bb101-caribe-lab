// Se ejecuta una vez al iniciar el servidor de Next.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // En algunas redes Node no alcanza friendbot/Horizon por IPv6 (timeout): preferir IPv4.
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
  }
}
