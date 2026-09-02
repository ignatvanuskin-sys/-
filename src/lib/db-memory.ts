/* eslint-disable @typescript-eslint/no-unused-vars */
import * as schema from "./schema";

// In-memory store for free mode (no DATABASE_URL)
// Mirrors pg tables via JS Maps, handles the specific queries used in the app

type TableName = keyof typeof stores;
const stores: Record<string, any[]> = {
  users: [],
  mailboxes: [],
  recipient_lists: [],
  recipients: [],
  templates: [],
  campaigns: [],
  campaign_recipients: [],
  suppression_list: [],
  global_settings: [],
};
const ids: Record<string, number> = {
  users: 1,
  mailboxes: 1,
  recipient_lists: 1,
  recipients: 1,
  templates: 1,
  campaigns: 1,
  campaign_recipients: 1,
  suppression_list: 1,
  global_settings: 1,
};

function tableNameOf(table: any): string {
  // drizzle table has Symbol(drizzle:Name)
  const name = table[Symbol.for("drizzle:Name")];
  if (name) return name;
  // fallback: try to infer from object
  for (const [k, v] of Object.entries(schema as any)) {
    if (v === table) return k === "recipientLists" ? "recipient_lists" : k === "campaignRecipients" ? "campaign_recipients" : k === "suppressionList" ? "suppression_list" : k === "globalSettings" ? "global_settings" : k;
  }
  return "unknown";
}

function colName(col: any): string {
  return col.name || col.key || "";
}

function matches(row: any, cond: any): boolean {
  if (!cond) return true;
  if (cond.__isEq) {
    if (cond.isColumnColumn) {
      // column == column (join) — not used in where, handled separately
      return true;
    }
    const name = cond.columnName;
    // drizzle col name may be snake_case vs camelCase: map
    // row keys are JS camelCase (from insert) but also need to handle snake_case? We store camelCase
    // Try both
    const val = row[name] ?? row[colName(cond.column)] ?? row[snakeToCamel(name)] ?? row[name];
    // Also try to get column name mapping: pg col name is e.g. 'email', 'list_id' vs JS `listId`
    // Our rows store JS keys (listId), but cond.columnName is db column name like 'list_id' or 'email'
    // Map db name to JS key
    const jsKey = dbToJsKey(name);
    const rowVal = row[jsKey] ?? row[name] ?? row[colName(cond.column)];
    return rowVal === cond.value;
  }
  if (cond.__isAnd) {
    return cond.conds.every((c: any) => matches(row, c));
  }
  return true;
}

function snakeToCamel(s: string) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function dbToJsKey(dbName: string): string {
  // map db column names to JS keys used in inserts
  const map: Record<string, string> = {
    password_hash: "passwordHash",
    created_at: "createdAt",
    updated_at: "updatedAt",
    smtp_host: "smtpHost",
    smtp_port: "smtpPort",
    password_encrypted: "passwordEncrypted",
    from_name: "fromName",
    from_email: "fromEmail",
    reply_to: "replyTo",
      custom_fields: "customFields",
    template_id: "templateId",
    mailbox_id: "mailboxId",
    variation_level: "variationLevel",
    delay_min_sec: "delayMinSec",
    delay_max_sec: "delayMaxSec",
    daily_limit: "dailyLimit",
    send_window_start: "sendWindowStart",
    send_window_end: "sendWindowEnd",
    scheduled_at: "scheduledAt",
    paused_at: "pausedAt",
    campaign_id: "campaignId",
    recipient_id: "recipientId",
    sent_subject: "sentSubject",
    sent_body: "sentBody",
    sent_at: "sentAt",
    error_message: "errorMessage",
    stop_all: "stopAll",
    footer_address: "footerAddress",
  };
  return map[dbName] || snakeToCamel(dbName);
}

function jsToDbKey(jsKey: string): string {
  // reverse, not needed
  return jsKey;
}

// Helpers for eq/and/desc that work for memory
export function eq(column: any, value: any) {
  // Check if value is a column (for join)
  if (value && typeof value === "object" && "name" in value && value.table) {
    return { __isEq: true, left: column, right: value, isColumnColumn: true, leftName: colName(column), rightName: colName(value) };
  }
  return { __isEq: true, column, value, columnName: colName(column), isColumnColumn: false };
}
export function and(...conds: any[]) {
  return { __isAnd: true, conds };
}
export function desc(column: any) {
  return { __isDesc: true, column, columnName: colName(column) };
}

// Memory DB implementation
export const memoryDb: any = {
  select(fields?: any) {
    // fields can be undefined (select all) or object like { cr: ..., recipient: ... }
    const state: any = { fields, fromTable: null, whereCond: null, orderBy: null, limitN: null, joins: [] };
    const builder: any = {
      from(table: any) {
        state.fromTable = table;
        return builder;
      },
      where(cond: any) {
        state.whereCond = cond;
        return builder;
      },
      orderBy(ob: any) {
        state.orderBy = ob;
        return builder;
      },
      limit(n: number) {
        state.limitN = n;
        return builder;
      },
      innerJoin(table: any, cond: any) {
        state.joins.push({ table, cond });
        return builder;
      },
      // Make thenable so `await db.select()...` works
      then(resolve: any, reject: any) {
        try {
          const result = executeSelect(state);
          resolve(result);
        } catch (e) { reject(e); }
      },
      // For drizzle, select().from()... is thenable, but also has `execute`?
      execute() {
        return executeSelect(state);
      },
    };
    // If called as `select()` with no from, it returns builder that will be awaited
    // To make `await db.select().from(users)` work, builder must be thenable
    return builder;
  },
  insert(table: any) {
    const tableName = tableNameOf(table);
    return {
      values(vals: any) {
        const arr = Array.isArray(vals) ? vals : [vals];
        const store = stores[tableName] ?? (stores[tableName] = []);
        const inserted: any[] = [];
        for (const v of arr) {
          // Handle onConflictDoNothing for suppression_list unique email
          if (tableName === "suppression_list" && v.email) {
            const exists = store.find((r) => r.email.toLowerCase() === v.email.toLowerCase());
            if (exists) continue; // do nothing
          }
          if (tableName === "users" && v.email) {
            const exists = store.find((r) => r.email.toLowerCase() === v.email.toLowerCase());
            if (exists) continue;
          }
          const id = ids[tableName] ?? 1;
          ids[tableName] = id + 1;
          const now = new Date();
          // Map JS keys to storage, keep both snake and camel for matching
          const row: any = { id, ...v };
          // Set defaults
          if (tableName === "recipients" && row.suppressed === undefined) row.suppressed = false;
          if (tableName === "recipients" && !row.customFields) row.customFields = {};
          if (tableName === "recipients" && !row.createdAt) row.createdAt = now;
          if (tableName === "users" && !row.createdAt) row.createdAt = now;
          if (tableName === "mailboxes" && !row.createdAt) row.createdAt = now;
          if (tableName === "mailboxes" && !row.updatedAt) row.updatedAt = now;
          if (tableName === "recipient_lists" && !row.createdAt) row.createdAt = now;
          if (tableName === "templates" && !row.createdAt) row.createdAt = now;
          if (tableName === "templates" && !row.updatedAt) row.updatedAt = now;
          if (tableName === "campaigns" && !row.createdAt) row.createdAt = now;
          if (tableName === "campaigns" && !row.status) row.status = "draft";
          if (tableName === "campaign_recipients" && !row.status) row.status = "queued";
          if (tableName === "suppression_list" && !row.createdAt) row.createdAt = now;
          if (tableName === "global_settings" && row.stopAll === undefined) row.stopAll = false;
          if (tableName === "global_settings" && !row.updatedAt) row.updatedAt = now;
          store.push(row);
          inserted.push(row);
        }
        return {
          returning() {
            return Promise.resolve(inserted);
          },
          onConflictDoNothing() {
            // Already handled above for suppression
            return Promise.resolve([]);
          },
          // Make thenable so `await db.insert(...).values(...)` without returning works
          then(resolve: any, reject: any) {
            resolve(inserted);
          },
        };
      },
    };
  },
  update(table: any) {
    const tableName = tableNameOf(table);
    return {
      set(vals: any) {
        return {
          where(cond: any) {
            const store = stores[tableName] ?? [];
            const matched = store.filter((r) => matches(r, cond));
            for (const r of matched) {
              Object.assign(r, vals);
              if (r.updatedAt !== undefined) r.updatedAt = new Date();
            }
            return {
              returning() { return Promise.resolve(matched); },
              then(resolve: any) { resolve(matched); },
            };
          },
        };
      },
    };
  },
  delete(table: any) {
    const tableName = tableNameOf(table);
    return {
      where(cond: any) {
        const store = stores[tableName] ?? [];
        const before = store.length;
        const remaining = store.filter((r) => !matches(r, cond));
        stores[tableName] = remaining;
        const deleted = before - remaining.length;
        return Promise.resolve({ deleted });
      },
    };
  },
};

function executeSelect(state: any): any {
  const tableName = state.fromTable ? tableNameOf(state.fromTable) : null;
  if (!tableName) return [];
  let rows: any[] = [...(stores[tableName] ?? [])];

  // Handle innerJoin for campaignRecipients + recipients
  if (state.joins.length > 0) {
    // Only handle the specific join used in the app: campaignRecipients innerJoin recipients
    const join = state.joins[0];
    const joinTableName = tableNameOf(join.table);
    const joinStore = stores[joinTableName] ?? [];
    // For select({ cr, recipient }), we need to produce joined rows
    if (state.fields && typeof state.fields === "object" && !Array.isArray(state.fields)) {
      const joined: any[] = [];
      for (const left of rows) {
        for (const right of joinStore) {
          // Check join condition: eq(campaignRecipients.recipientId, recipients.id)
          // For memory, join.cond is { __isEq, left, right, isColumnColumn }
          let joinOk = true;
          if (join.cond && join.cond.__isEq && join.cond.isColumnColumn) {
            const leftVal = left[dbToJsKey(join.cond.leftName)] ?? left[join.cond.leftName] ?? left[colName(join.cond.left)];
            const rightVal = right[dbToJsKey(join.cond.rightName)] ?? right[join.cond.rightName] ?? right[colName(join.cond.right)];
            joinOk = leftVal === rightVal;
          }
          if (joinOk) {
            // Apply where filter on joined result? where is on campaignId
            // We'll filter after
            const obj: any = {};
            for (const [k, v] of Object.entries(state.fields)) {
              if (v === state.fromTable) obj[k] = left;
              else if (v === join.table) obj[k] = right;
              else obj[k] = null;
            }
            joined.push(obj);
          }
        }
      }
      rows = joined;
      // Apply where on joined rows: where(eq(campaignRecipients.campaignId, campaignId))
      // For joined, row is { cr, recipient }, but where cond is on cr.campaignId
      // We need to handle where for joined: check cr field
      if (state.whereCond) {
        rows = rows.filter((r) => {
          // r is { cr, recipient }
          // cond is eq on campaignRecipients.campaignId
          if (state.whereCond.__isEq) {
            const colNameStr = state.whereCond.columnName;
            // column is from campaignRecipients
            const jsKey = dbToJsKey(colNameStr);
            // Try cr[jsKey] or cr[colNameStr]
            const val = r.cr ? (r.cr[jsKey] ?? r.cr[colNameStr]) : undefined;
            return val === state.whereCond.value;
          }
          if (state.whereCond.__isAnd) {
            return state.whereCond.conds.every((c: any) => {
              if (c.__isEq) {
                const jsKey2 = dbToJsKey(c.columnName);
                const val2 = r.cr ? (r.cr[jsKey2] ?? r.cr[c.columnName]) : undefined;
                return val2 === c.value;
              }
              return true;
            });
          }
          return true;
        });
      }
      // orderBy/limit for joined not used
      if (state.limitN) rows = rows.slice(0, state.limitN);
      return rows;
    }
  }

  // Normal where
  if (state.whereCond) {
    rows = rows.filter((r) => matches(r, state.whereCond));
  }
  // orderBy
  if (state.orderBy && state.orderBy.__isDesc) {
    const col = state.orderBy.columnName;
    const jsKey = dbToJsKey(col);
    rows = [...rows].sort((a, b) => {
      const av = a[jsKey] ?? a[col] ?? a[dbToJsKey(col)];
      const bv = b[jsKey] ?? b[col] ?? b[dbToJsKey(col)];
      if (av > bv) return -1;
      if (av < bv) return 1;
      return 0;
    });
  }
  if (state.limitN) rows = rows.slice(0, state.limitN);

  // Handle select fields: if fields is object, we already handled join case; for normal select without fields, return rows
  // For `select()` with no args, return rows
  return rows;
}
