import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const {
  RECHARGE_MIN_FEN,
  RECHARGE_MAX_FEN,
} = require("../constants/recharge");
const {
  COLLECTION_USER_CREDITS,
  COLLECTION_CREDIT_ORDERS,
  COLLECTION_CREDIT_LEDGER,
  LEDGER_TYPE_RECHARGE,
  INITIAL_GRANT,
} = require("../constants/credits");
const { addCredits, getBalanceSummary } = require("./credits");
const {
  normalizeAmountFen,
  fulfillOrder,
} = require("./recharge-order");

let idCounter = 0;

function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** 内存云数据库 mock，覆盖充值相关 collection API */
function createMockDb() {
  const stores = {
    [COLLECTION_USER_CREDITS]: new Map(),
    [COLLECTION_CREDIT_ORDERS]: new Map(),
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
                const store = stores[name];
                const rows = Array.isArray(store)
                  ? store.filter((doc) => matchWhere(doc, where))
                  : [...store.values()].filter((doc) => matchWhere(doc, where));
                return { data: rows.slice(0, 1) };
              },
            };
          },
          async update({ data }) {
            let updated = 0;
            const store = stores[name];
            if (Array.isArray(store)) return { stats: { updated: 0 } };
            for (const [id, doc] of store.entries()) {
              if (matchWhere(doc, where)) {
                store.set(id, { ...doc, ...data });
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
            const store = stores[name];
            const doc = Array.isArray(store) ? null : store.get(id);
            return { data: doc ? { ...doc } : null };
          },
          async update({ data }) {
            const store = stores[name];
            if (Array.isArray(store)) return;
            const doc = store.get(id);
            if (!doc) return;
            store.set(id, { ...doc, ...data });
          },
        };
      },
    };
  }

  return { collection, command: {}, _stores: stores };
}

describe("normalizeAmountFen", () => {
  it("面值 1:1 换算积分", () => {
    expect(normalizeAmountFen(100)).toEqual({ amountFen: 100, credits: 100 });
    expect(normalizeAmountFen(20000)).toEqual({
      amountFen: 20000,
      credits: 20000,
    });
  });

  it("低于最低或高于最高拒绝", () => {
    expect(() => normalizeAmountFen(RECHARGE_MIN_FEN - 1)).toThrow();
    expect(() => normalizeAmountFen(RECHARGE_MAX_FEN + 1)).toThrow();
  });

  it("非正整数拒绝", () => {
    expect(() => normalizeAmountFen(0)).toThrow();
    expect(() => normalizeAmountFen(1.5)).toThrow();
  });
});

describe("addCredits", () => {
  it("充值直接增加 balance 并写 recharge 流水", async () => {
    const db = createMockDb();
    const openid = "user-recharge-1";
    await addCredits(db, openid, 500, "order-1");

    const summary = await getBalanceSummary(db, openid);
    expect(summary.balance).toBe(INITIAL_GRANT + 500);

    const ledger = db._stores[COLLECTION_CREDIT_LEDGER];
    expect(ledger.some((e) => e.type === LEDGER_TYPE_RECHARGE)).toBe(true);
  });
});

describe("fulfillOrder", () => {
  it("幂等：重复回调不重复入账", async () => {
    const db = createMockDb();
    const openid = "user-recharge-2";
    const outTradeNo = "R123456";
    const orderId = nextId("order");

    db._stores[COLLECTION_CREDIT_ORDERS].set(orderId, {
      _id: orderId,
      _openid: openid,
      outTradeNo,
      totalFee: 600,
      credits: 600,
      status: "pending",
    });

    await fulfillOrder(db, outTradeNo, { totalFee: 600, transactionId: "wx1" });
    await fulfillOrder(db, outTradeNo, { totalFee: 600, transactionId: "wx1" });

    const summary = await getBalanceSummary(db, openid);
    expect(summary.balance).toBe(INITIAL_GRANT + 600);

    const rechargeEntries = db._stores[COLLECTION_CREDIT_LEDGER].filter(
      (e) => e.type === LEDGER_TYPE_RECHARGE && e.refId === outTradeNo,
    );
    expect(rechargeEntries).toHaveLength(1);
  });

  it("回调金额与订单不一致拒绝", async () => {
    const db = createMockDb();
    const openid = "user-recharge-3";
    const outTradeNo = "R789";
    const orderId = nextId("order");

    db._stores[COLLECTION_CREDIT_ORDERS].set(orderId, {
      _id: orderId,
      _openid: openid,
      outTradeNo,
      totalFee: 100,
      credits: 100,
      status: "pending",
    });

    await expect(
      fulfillOrder(db, outTradeNo, { totalFee: 200 }),
    ).rejects.toMatchObject({ error: "AMOUNT_MISMATCH" });
  });
});
