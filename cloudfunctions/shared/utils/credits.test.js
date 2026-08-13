import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const {
  INITIAL_GRANT,
  ERROR_INSUFFICIENT,
  COLLECTION_USER_CREDITS,
  COLLECTION_CREDIT_HOLDS,
  COLLECTION_CREDIT_LEDGER,
} = require("../constants/credits");
const {
  getAvailable,
  ensureAccount,
  hold,
  settle,
  release,
  getBalanceSummary,
} = require("./credits");

let idCounter = 0;

function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** 内存云数据库 mock，覆盖 credits.js 实际调用的 collection API */
function createMockDb() {
  const stores = {
    [COLLECTION_USER_CREDITS]: new Map(),
    [COLLECTION_CREDIT_HOLDS]: new Map(),
    [COLLECTION_CREDIT_LEDGER]: [],
  };

  function matchWhere(doc, where) {
    return Object.entries(where).every(([key, value]) => doc[key] === value);
  }

  function collection(name) {
    return {
      where(where) {
        return {
          limit() {
            return {
              async get() {
                const rows = [...stores[name].values()].filter((doc) =>
                  matchWhere(doc, where),
                );
                return { data: rows.slice(0, 1) };
              },
            };
          },
          async update({ data }) {
            let updated = 0;
            for (const [id, doc] of stores[name].entries()) {
              if (matchWhere(doc, where)) {
                stores[name].set(id, { ...doc, ...data });
                updated += 1;
              }
            }
            return { stats: { updated } };
          },
        };
      },
      async add({ data }) {
        const _id = nextId(name);
        const row = { _id, ...data };
        const store = stores[name];
        if (Array.isArray(store)) {
          store.push(row);
        } else {
          store.set(_id, row);
        }
        return { _id };
      },
      doc(id) {
        return {
          async get() {
            const doc = stores[name].get(id);
            return { data: doc ? { ...doc } : null };
          },
          async update({ data }) {
            const doc = stores[name].get(id);
            if (!doc) return;
            stores[name].set(id, { ...doc, ...data });
          },
        };
      },
    };
  }

  return {
    collection,
    command: {},
    _stores: stores,
  };
}

describe("getAvailable", () => {
  it("缺字段按 0 计算可用积分", () => {
    expect(getAvailable({})).toBe(0);
    expect(getAvailable({ balance: 100 })).toBe(100);
    expect(getAvailable({ balance: 100, frozen: 30 })).toBe(70);
  });
});

describe("ensureAccount", () => {
  it("首次创建账户赠送 INITIAL_GRANT", async () => {
    const db = createMockDb();
    const openid = "user-1";
    const account = await ensureAccount(db, openid);
    expect(account.balance).toBe(INITIAL_GRANT);
    expect(account.frozen).toBe(0);
    expect(db._stores[COLLECTION_CREDIT_LEDGER]).toHaveLength(1);
    expect(db._stores[COLLECTION_CREDIT_LEDGER][0].type).toBe("grant");
  });
});

describe("hold", () => {
  it("预占金额必须大于 0", async () => {
    const db = createMockDb();
    await expect(hold(db, "user-1", 0, "recognize")).rejects.toThrow(
      "预占积分必须大于 0",
    );
  });

  it("余额不足时抛出 INSUFFICIENT_CREDITS", async () => {
    const db = createMockDb();
    const openid = "user-2";
    await ensureAccount(db, openid);
    await db
      .collection(COLLECTION_USER_CREDITS)
      .where({ _openid: openid })
      .update({
        data: { balance: 10, frozen: 0 },
      });

    try {
      await hold(db, openid, 60, "recognize");
      throw new Error("应当抛出积分不足");
    } catch (err) {
      expect(err.error).toBe(ERROR_INSUFFICIENT);
    }
  });

  it("成功预占后冻结积分并返回 holdId", async () => {
    const db = createMockDb();
    const openid = "user-3";
    await ensureAccount(db, openid);
    const { holdId, amount } = await hold(db, openid, 60, "recognize", "ref-1");
    expect(amount).toBe(60);
    expect(holdId).toBeTruthy();

    const summary = await getBalanceSummary(db, openid);
    expect(summary.balance).toBe(INITIAL_GRANT);
    expect(summary.frozen).toBe(60);
    expect(summary.available).toBe(INITIAL_GRANT - 60);
  });
});

describe("settle", () => {
  it("实扣 settledAmount 并释放整笔冻结", async () => {
    const db = createMockDb();
    const openid = "user-4";
    await ensureAccount(db, openid);
    const { holdId } = await hold(db, openid, 60, "recognize");

    const result = await settle(db, openid, holdId, 40);
    expect(result.settledAmount).toBe(40);

    const summary = await getBalanceSummary(db, openid);
    expect(summary.balance).toBe(INITIAL_GRANT - 40);
    expect(summary.frozen).toBe(0);
    expect(summary.available).toBe(INITIAL_GRANT - 40);

    const holdDoc = await db
      .collection(COLLECTION_CREDIT_HOLDS)
      .doc(holdId)
      .get();
    expect(holdDoc.data.status).toBe("settled");
    expect(holdDoc.data.settledAmount).toBe(40);
  });

  it("结算金额超出预占范围时抛错", async () => {
    const db = createMockDb();
    const openid = "user-5";
    await ensureAccount(db, openid);
    const { holdId } = await hold(db, openid, 60, "recognize");

    await expect(settle(db, openid, holdId, 61)).rejects.toThrow(
      "结算积分超出预占范围",
    );
  });
});

describe("release", () => {
  it("释放预占不扣余额，仅解冻", async () => {
    const db = createMockDb();
    const openid = "user-6";
    await ensureAccount(db, openid);
    const { holdId } = await hold(db, openid, 60, "recognize");

    const result = await release(db, openid, holdId);
    expect(result.releasedAmount).toBe(60);

    const summary = await getBalanceSummary(db, openid);
    expect(summary.balance).toBe(INITIAL_GRANT);
    expect(summary.frozen).toBe(0);
    expect(summary.available).toBe(INITIAL_GRANT);

    const holdDoc = await db
      .collection(COLLECTION_CREDIT_HOLDS)
      .doc(holdId)
      .get();
    expect(holdDoc.data.status).toBe("released");
  });
});

describe("getBalanceSummary", () => {
  it("available 等于 balance 减 frozen", async () => {
    const db = createMockDb();
    const openid = "user-7";
    await ensureAccount(db, openid);
    await hold(db, openid, 60, "recognize");

    const summary = await getBalanceSummary(db, openid);
    expect(summary.available).toBe(summary.balance - summary.frozen);
    expect(summary.initialGranted).toBe(true);
  });
});
