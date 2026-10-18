import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_MEMBERS,
  describeChange,
  diffMembers,
  parseMembers,
  type MemberSnapshot,
} from "./members";

const row = (username: string, pct: string, isAdmin = false, role = "") => ({
  username,
  role,
  pct,
  isAdmin,
});

function errorOf(raw: unknown) {
  const res = parseMembers(raw);
  assert.equal(res.ok, false);
  return (res as { error: string }).error;
}

test("parseMembers normaliza @usuario, rol y % en puntos básicos", () => {
  const res = parseMembers([row(" @Laura ", "45", true, " Voz "), row("andres", "45"), row("pedro", "10")]);
  assert.deepEqual(res, {
    ok: true,
    members: [
      { username: "laura", role: "Voz", share_bps: 4500, is_admin: true },
      { username: "andres", role: "", share_bps: 4500, is_admin: false },
      { username: "pedro", role: "", share_bps: 1000, is_admin: false },
    ],
  });
});

test("parseMembers acepta decimales con coma", () => {
  const res = parseMembers([row("laura", "33,34", true), row("andres", "33,33"), row("pedro", "33.33")]);
  assert.equal(res.ok, true);
});

test("parseMembers exige al menos un integrante y respeta el máximo", () => {
  assert.match(errorOf([]), /al menos un integrante/);
  assert.match(errorOf("nada"), /al menos un integrante/);
  const many = Array.from({ length: MAX_MEMBERS + 1 }, (_, i) => row(`user_${i}`, "1", i === 0));
  assert.match(errorOf(many), new RegExp(`Máximo ${MAX_MEMBERS}`));
});

test("parseMembers rechaza usuarios inválidos o repetidos", () => {
  assert.match(errorOf([row("la", "100", true)]), /@la/);
  assert.match(errorOf([row("", "100", true)]), /usuario/);
  assert.match(errorOf([row("laura", "50", true), row("@LAURA", "50")]), /@laura.*repetid/);
});

test("parseMembers exige que los % sumen 100", () => {
  assert.match(errorOf([row("laura", "50", true), row("andres", "40")]), /sumar 100%.*90/);
  assert.match(errorOf([row("laura", "0", true), row("andres", "100")]), /entre 0,01 y 100/);
  assert.match(errorOf([row("laura", "abc", true)]), /entre 0,01 y 100/);
});

test("parseMembers exige al menos un admin", () => {
  assert.match(errorOf([row("laura", "50"), row("andres", "50")]), /admin/);
});

test("parseMembers solo toma isAdmin === true", () => {
  const res = parseMembers([
    row("laura", "50", true),
    { username: "andres", role: "", pct: "50", isAdmin: "true" },
  ]);
  assert.equal(res.ok, true);
  assert.equal((res as { members: { is_admin: boolean }[] }).members[1].is_admin, false);
});

const snap = (
  user_id: string,
  share_bps: number,
  extra: Partial<MemberSnapshot> = {},
): MemberSnapshot => ({
  user_id,
  username: user_id,
  display_name: user_id[0].toUpperCase() + user_id.slice(1),
  role: "",
  share_bps,
  is_admin: false,
  ...extra,
});

test("diffMembers: proyecto nuevo = todos agregados", () => {
  const after = [snap("laura", 10000, { is_admin: true })];
  assert.deepEqual(diffMembers([], after), [{ kind: "added", member: after[0] }]);
});

test("diffMembers detecta %, rol, admin, altas y bajas", () => {
  const before = [
    snap("laura", 4500, { is_admin: true, role: "Voz" }),
    snap("andres", 4500),
    snap("pedro", 1000),
  ];
  const after = [
    snap("laura", 4000, { is_admin: true, role: "Voz y guitarra" }),
    snap("pedro", 1000, { is_admin: true }),
    snap("maria", 5000),
  ];
  assert.deepEqual(
    diffMembers(before, after).map((c) => [c.kind, c.member.username]),
    [
      ["share", "laura"],
      ["role", "laura"],
      ["admin", "pedro"],
      ["added", "maria"],
      ["removed", "andres"],
    ],
  );
});

test("diffMembers sin cambios devuelve vacío", () => {
  const members = [snap("laura", 10000, { is_admin: true })];
  assert.deepEqual(diffMembers(members, members), []);
});

test("describeChange redacta cada cambio en español", () => {
  const pedro = snap("pedro", 2000, { display_name: "Pedro" });
  assert.equal(
    describeChange({ kind: "share", member: pedro, from: 1000, to: 2000 }),
    "Pedro (@pedro): de 10% a 20%",
  );
  assert.equal(
    describeChange({ kind: "added", member: { ...pedro, role: "Bajo", is_admin: true } }),
    "Entró Pedro (@pedro) con 20%, como Bajo, admin",
  );
  assert.equal(describeChange({ kind: "removed", member: pedro }), "Salió Pedro (@pedro)");
  assert.equal(
    describeChange({ kind: "role", member: pedro, from: "", to: "Bajo" }),
    "Pedro (@pedro): rol «Bajo»",
  );
  assert.equal(
    describeChange({ kind: "role", member: pedro, from: "Bajo", to: "" }),
    "Pedro (@pedro): sin rol",
  );
  assert.equal(
    describeChange({ kind: "admin", member: pedro, granted: true }),
    "Pedro (@pedro) ahora es admin",
  );
  assert.equal(
    describeChange({ kind: "admin", member: pedro, granted: false }),
    "Pedro (@pedro) ya no es admin",
  );
  assert.equal(
    describeChange({ kind: "share", member: pedro, from: 3334, to: 3333 }),
    "Pedro (@pedro): de 33,34% a 33,33%",
  );
});
