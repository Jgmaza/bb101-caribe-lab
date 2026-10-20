import assert from "node:assert/strict";
import { test } from "node:test";
import { EVENT_ROLES, normalizeRole } from "./roles";

test("normalizeRole reconoce alias de roles de evento", () => {
  assert.equal(normalizeRole("Musico"), "músico");
  assert.equal(normalizeRole("COCINA"), "cocinero");
  assert.equal(normalizeRole("audio"), "sonido");
  assert.equal(normalizeRole("vigilante"), "seguridad");
  assert.equal(normalizeRole("staff"), "staff");
});

test("normalizeRole conserva roles desconocidos recortados", () => {
  assert.equal(normalizeRole("comparsa norte"), "comparsa norte");
  assert.equal(normalizeRole(""), "");
});

test("EVENT_ROLES incluye los roles del MVP hotel", () => {
  for (const r of ["músico", "staff", "cocinero", "sonido", "seguridad", "técnico", "otro"]) {
    assert.ok(EVENT_ROLES.includes(r as (typeof EVENT_ROLES)[number]));
  }
});
