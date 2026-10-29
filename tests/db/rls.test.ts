import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

// Proves Row Level Security isolates workspaces. Everything runs inside one
// transaction that is rolled back at the end, so nothing is left in the
// database; each test rolls back to a savepoint taken after seeding.
// Rows are seeded as the connection's owner role (bypasses RLS), then queries
// run as Supabase's `authenticated` / `anon` roles with a JWT "sub" claim set,
// exactly as the Data API would.

const client = new Client({ connectionString: process.env.DIRECT_URL });

type World = Awaited<ReturnType<typeof seedWorkspace>>;
let a: World;
let b: World;

async function seedWorkspace(label: string) {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const formId = randomUUID();
  const versionId = randomUUID();
  const submissionId = randomUUID();
  const ids = {
    userId,
    workspaceId,
    membershipId: randomUUID(),
    formId,
    versionId,
    submissionId,
    paymentId: randomUUID(),
    paymentAccountId: randomUUID(),
    couponId: randomUUID(),
    fileId: randomUUID(),
    auditId: randomUUID(),
  };
  const q = (sql: string, params: unknown[]) => client.query(sql, params);
  await q(`insert into profiles (id, email) values ($1, $2)`, [
    userId,
    `${label}@example.test`,
  ]);
  await q(`insert into workspaces (id, owner_id, name) values ($1, $2, $3)`, [
    workspaceId,
    userId,
    `${label} workspace`,
  ]);
  await q(
    `insert into memberships (id, workspace_id, user_id, role) values ($1, $2, $3, 'owner')`,
    [ids.membershipId, workspaceId, userId],
  );
  await q(
    `insert into forms (id, workspace_id, slug, title) values ($1, $2, $3, $4)`,
    [formId, workspaceId, `${label}-${formId}`, `${label} form`],
  );
  await q(
    `insert into form_versions (id, form_id, schema_json) values ($1, $2, '{}')`,
    [versionId, formId],
  );
  await q(`update forms set current_version_id = $1 where id = $2`, [
    versionId,
    formId,
  ]);
  await q(
    `insert into submissions (id, form_id, form_version_id, answers_json, status, amount_minor)
     values ($1, $2, $3, '{}', 'paid', 49900)`,
    [submissionId, formId, versionId],
  );
  await q(
    `insert into payments (id, submission_id, provider, provider_order_id, status, amount_minor)
     values ($1, $2, 'razorpay', $3, 'captured', 49900)`,
    [ids.paymentId, submissionId, `order_${label}`],
  );
  await q(
    `insert into payment_accounts (id, workspace_id, provider, key_id, secret_encrypted)
     values ($1, $2, 'razorpay', $3, 'ciphertext')`,
    [ids.paymentAccountId, workspaceId, `rzp_test_${label}`],
  );
  await q(
    `insert into coupons (id, form_id, code, type, value) values ($1, $2, 'SAVE10', 'percent', 1000)`,
    [ids.couponId, formId],
  );
  await q(
    `insert into files (id, submission_id, path, size, mime) values ($1, $2, 'x.pdf', 10, 'application/pdf')`,
    [ids.fileId, submissionId],
  );
  await q(
    `insert into audit_log (id, workspace_id, actor_id, action) values ($1, $2, $3, 'form.created')`,
    [ids.auditId, workspaceId, userId],
  );
  return ids;
}

/** Switch to a Data API role for the rest of the transaction. */
async function actAs(role: "authenticated" | "anon", userId?: string) {
  await client.query("reset role");
  const claims = userId ? { sub: userId, role } : { role };
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify(claims),
  ]);
  await client.query(`set local role ${role}`);
}

/** Back to the connection's owner role (bypasses RLS). */
async function actAsOwner() {
  await client.query("reset role");
}

/** Run a statement that must fail with the given SQLSTATE, without aborting the transaction. */
async function expectPgError(sql: string, params: unknown[], code: string) {
  await client.query("savepoint expect_error");
  let error: unknown;
  try {
    await client.query(sql, params);
  } catch (e) {
    error = e;
  }
  await client.query("rollback to savepoint expect_error");
  expect(error, `expected "${sql}" to fail with ${code}`).toBeDefined();
  expect((error as { code?: string }).code).toBe(code);
}

async function ids(table: string) {
  const { rows } = await client.query<{ id: string }>(
    `select id from ${table} order by id`,
  );
  return rows.map((r) => r.id);
}

beforeAll(async () => {
  await client.connect();
  await client.query("begin");
  a = await seedWorkspace("alice");
  b = await seedWorkspace("bob");
});

afterAll(async () => {
  await client.query("rollback");
  await client.end();
});

beforeEach(async () => {
  await client.query("savepoint test_start");
});

afterEach(async () => {
  // Also undoes `set local role` and the JWT claims.
  await client.query("rollback to savepoint test_start");
});

describe("RLS workspace isolation", () => {
  const tables = [
    ["profiles", "userId"],
    ["workspaces", "workspaceId"],
    ["memberships", "membershipId"],
    ["forms", "formId"],
    ["form_versions", "versionId"],
    ["submissions", "submissionId"],
    ["payments", "paymentId"],
    ["payment_accounts", "paymentAccountId"],
    ["coupons", "couponId"],
    ["files", "fileId"],
    ["audit_log", "auditId"],
  ] as const;

  it.each(tables)(
    "%s: each user sees only their own rows",
    async (table, key) => {
      await actAs("authenticated", a.userId);
      expect(await ids(table)).toEqual([a[key]]);
      await actAs("authenticated", b.userId);
      expect(await ids(table)).toEqual([b[key]]);
    },
  );

  it("cannot update or delete another workspace's rows", async () => {
    await actAs("authenticated", a.userId);
    const updates = [
      [`update workspaces set name = 'pwned' where id = $1`, b.workspaceId],
      [`update forms set title = 'pwned' where id = $1`, b.formId],
      [
        `update submissions set status = 'completed' where id = $1`,
        b.submissionId,
      ],
      [`update memberships set role = 'member' where id = $1`, b.membershipId],
      [`update profiles set name = 'pwned' where id = $1`, b.userId],
      [`delete from forms where id = $1`, b.formId],
      [`delete from submissions where id = $1`, b.submissionId],
      [`delete from coupons where id = $1`, b.couponId],
      [`delete from workspaces where id = $1`, b.workspaceId],
    ] as const;
    for (const [sql, id] of updates) {
      const result = await client.query(sql, [id]);
      expect(result.rowCount, sql).toBe(0);
    }

    await actAsOwner();
    const { rows } = await client.query(
      `select w.name, f.title from workspaces w join forms f on f.workspace_id = w.id where w.id = $1`,
      [b.workspaceId],
    );
    expect(rows).toEqual([{ name: "bob workspace", title: "bob form" }]);
  });

  it("cannot insert into another workspace or join it", async () => {
    await actAs("authenticated", a.userId);
    await expectPgError(
      `insert into forms (workspace_id, slug, title) values ($1, $2, 'x')`,
      [b.workspaceId, `evil-${randomUUID()}`],
      "42501",
    );
    await expectPgError(
      `insert into memberships (workspace_id, user_id, role) values ($1, $2, 'owner')`,
      [b.workspaceId, a.userId],
      "42501",
    );
    await expectPgError(
      `insert into workspaces (owner_id, name) values ($1, 'x')`,
      [b.userId],
      "42501",
    );
    await expectPgError(
      `insert into form_versions (form_id, schema_json) values ($1, '{}')`,
      [b.formId],
      "42501",
    );
    await expectPgError(
      `insert into coupons (form_id, code, type, value) values ($1, 'FREE', 'percent', 10000)`,
      [b.formId],
      "42501",
    );
  });

  it("cannot move own rows into another workspace", async () => {
    await actAs("authenticated", a.userId);
    await expectPgError(
      `update forms set workspace_id = $1 where id = $2`,
      [b.workspaceId, a.formId],
      "42501",
    );
  });

  it("can create a workspace and bootstrap own owner membership", async () => {
    const workspaceId = randomUUID();
    await actAs("authenticated", a.userId);
    await client.query(
      `insert into workspaces (id, owner_id, name) values ($1, $2, 'second')`,
      [workspaceId, a.userId],
    );
    await client.query(
      `insert into memberships (workspace_id, user_id, role) values ($1, $2, 'owner')`,
      [workspaceId, a.userId],
    );
    expect(await ids("workspaces")).toEqual(
      [a.workspaceId, workspaceId].sort(),
    );
  });

  it("plain members cannot see payment accounts or the audit log", async () => {
    const carolId = randomUUID();
    await client.query(
      `insert into profiles (id, email) values ($1, 'carol@example.test')`,
      [carolId],
    );
    await client.query(
      `insert into memberships (workspace_id, user_id, role) values ($1, $2, 'member')`,
      [a.workspaceId, carolId],
    );
    await actAs("authenticated", carolId);
    expect(await ids("forms")).toEqual([a.formId]);
    expect(await ids("payment_accounts")).toEqual([]);
    expect(await ids("audit_log")).toEqual([]);
  });
});

describe("Data API grants", () => {
  it("payment secrets are not readable, even by the owner", async () => {
    await actAs("authenticated", a.userId);
    const { rows } = await client.query(`select key_id from payment_accounts`);
    expect(rows).toEqual([{ key_id: "rzp_test_alice" }]);
    await expectPgError(
      `select secret_encrypted from payment_accounts`,
      [],
      "42501",
    );
    await expectPgError(
      `select webhook_secret_encrypted from payment_accounts`,
      [],
      "42501",
    );
    await expectPgError(`select * from payment_accounts`, [], "42501");
  });

  it("webhook events are server-only", async () => {
    await actAs("authenticated", a.userId);
    await expectPgError(`select id from webhook_events`, [], "42501");
  });

  it("rate limits are server-only", async () => {
    await actAs("authenticated", a.userId);
    await expectPgError(`select key from rate_limits`, [], "42501");
    await actAs("anon");
    await expectPgError(
      `insert into rate_limits (key, window_start) values ('x', now())`,
      [],
      "42501",
    );
  });

  it("payments are read-only for users", async () => {
    await actAs("authenticated", a.userId);
    await expectPgError(
      `update payments set amount_minor = 1 where id = $1`,
      [a.paymentId],
      "42501",
    );
  });

  it("anonymous users can read nothing", async () => {
    await actAs("anon");
    for (const table of [
      "profiles",
      "workspaces",
      "forms",
      "submissions",
      "payments",
    ]) {
      await expectPgError(`select id from ${table}`, [], "42501");
    }
  });
});

describe("Integrity", () => {
  it("form versions are immutable, even for the owner role", async () => {
    await expectPgError(
      `update form_versions set schema_json = '{"x":1}' where id = $1`,
      [a.versionId],
      "23001",
    );
  });

  it("audit log is append-only", async () => {
    await expectPgError(
      `update audit_log set action = 'x' where id = $1`,
      [a.auditId],
      "23001",
    );
  });

  it("a submission cannot reference another form's version", async () => {
    await expectPgError(
      `insert into submissions (form_id, form_version_id, answers_json) values ($1, $2, '{}')`,
      [a.formId, b.versionId],
      "23503",
    );
  });

  it("money amounts cannot be negative", async () => {
    await expectPgError(
      `insert into submissions (form_id, form_version_id, answers_json, amount_minor)
       values ($1, $2, '{}', -1)`,
      [a.formId, a.versionId],
      "23514",
    );
  });
});
