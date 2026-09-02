import { describe, it, expect, beforeEach } from "vitest";
import { memoryDb, eq, and, desc } from "./db-memory";
import { users } from "./schema";

describe("db-memory eq/and/desc", () => {
  it("eq creates isEq object", () => {
    const c = eq(users.email, "a@test.com");
    expect(c.__isEq).toBe(true);
    expect(c.columnName).toBe("email");
    expect(c.value).toBe("a@test.com");
  });

  it("eq with column-column for join", () => {
    // Use two columns
    const c = eq(users.email as any, users.id as any);
    // Since second arg is column object with name, it should be isColumnColumn
    // In our eq, we check 'name' in value && value.table
    // users.id has table, so it should be column-column
    expect(c.isColumnColumn).toBe(true);
  });

  it("and combines", () => {
    const c1 = eq(users.email, "a@test.com");
    const c2 = eq(users.id as any, 1);
    const a = and(c1, c2);
    expect(a.__isAnd).toBe(true);
    expect(a.conds).toHaveLength(2);
  });

  it("desc creates isDesc", () => {
    const d = desc(users.id);
    expect(d.__isDesc).toBe(true);
    expect(d.columnName).toBe("id");
  });
});

describe("memoryDb CRUD", () => {
  // Use a fresh store via direct insert/select
  // Note: stores are global, so we test with a unique table to avoid pollution
  // We'll use `users` and clean via delete
  beforeEach(async () => {
    // Clean users
    const all = await memoryDb.select().from(users);
    for (const u of all) {
      await memoryDb.delete(users).where(eq(users.id, u.id));
    }
  });

  it("insert and select", async () => {
    const inserted = await memoryDb.insert(users).values({ email: "test1@test.com", passwordHash: "hash" }).returning();
    expect(inserted).toHaveLength(1);
    expect(inserted[0].email).toBe("test1@test.com");
    expect(inserted[0].id).toBeDefined();

    const rows = await memoryDb.select().from(users).where(eq(users.email, "test1@test.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("test1@test.com");
  });

  it("handles onConflictDoNothing for duplicate email", async () => {
    await memoryDb.insert(users).values({ email: "dup@test.com", passwordHash: "h1" }).returning();
    // Second insert with same email should be ignored via onConflictDoNothing
    const res = await memoryDb.insert(users).values({ email: "dup@test.com", passwordHash: "h2" }).onConflictDoNothing();
    // Our implementation returns [] for onConflictDoNothing when duplicate
    expect(res).toEqual([]);
    const rows = await memoryDb.select().from(users).where(eq(users.email, "dup@test.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0].passwordHash).toBe("h1"); // first wins
  });

  it("update where", async () => {
    const [u] = await memoryDb.insert(users).values({ email: "upd@test.com", passwordHash: "old" }).returning();
    await memoryDb.update(users).set({ passwordHash: "new" }).where(eq(users.id, u.id));
    const rows = await memoryDb.select().from(users).where(eq(users.id, u.id));
    expect(rows[0].passwordHash).toBe("new");
  });

  it("delete where", async () => {
    const [u] = await memoryDb.insert(users).values({ email: "del@test.com", passwordHash: "h" }).returning();
    await memoryDb.delete(users).where(eq(users.id, u.id));
    const rows = await memoryDb.select().from(users).where(eq(users.id, u.id));
    expect(rows).toHaveLength(0);
  });

  it("orderBy desc and limit", async () => {
    await memoryDb.insert(users).values({ email: "a@test.com", passwordHash: "h" });
    await memoryDb.insert(users).values({ email: "b@test.com", passwordHash: "h" });
    await memoryDb.insert(users).values({ email: "c@test.com", passwordHash: "h" });
    const rows = await memoryDb.select().from(users).orderBy(desc(users.id)).limit(2);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBeGreaterThan(rows[1].id);
  });

  it("and where", async () => {
    await memoryDb.insert(users).values({ email: "and@test.com", passwordHash: "h" });
    const rows = await memoryDb.select().from(users).where(and(eq(users.email, "and@test.com"), eq(users.passwordHash, "h")));
    expect(rows).toHaveLength(1);
    const no = await memoryDb.select().from(users).where(and(eq(users.email, "and@test.com"), eq(users.passwordHash, "wrong")));
    expect(no).toHaveLength(0);
  });
});
