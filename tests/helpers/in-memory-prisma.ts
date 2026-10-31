import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma";

/**
 * Minimal in-memory stand-in for the Prisma models used by the sponsorship flows. It supports
 * the query shapes those flows use (equality, in/not/gt/gte/lt/lte, OR, compound unique keys,
 * relation include/select and `_count`) and enforces the schema's unique constraints, so
 * state transitions can be asserted without a database.
 */

type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;
type Spec = Record<string, unknown> | undefined;
type OrderBy = Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>;

type ModelName = "learner" | "sponsor" | "sponsorOrder" | "sponsorshipCart" | "sponsorshipCartItem";

type Relation = { model: ModelName; resolve: (row: Row) => Row | Row[] | null };

type FindArgs = { where?: Where; orderBy?: OrderBy; take?: number; select?: Spec; include?: Spec };
type WriteArgs = { where?: Where; data: Record<string, unknown>; select?: Spec; include?: Spec };

const comparable = (value: unknown) => (value instanceof Date ? value.getTime() : value);

const isOperatorObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !(value instanceof Date) && !Array.isArray(value);

const matchesCondition = (value: unknown, condition: unknown): boolean => {
  if (condition === undefined) {
    return true;
  }

  if (!isOperatorObject(condition)) {
    return comparable(value ?? null) === comparable(condition);
  }

  return Object.entries(condition).every(([operator, operand]) => {
    const left = comparable(value) as number;
    const right = comparable(operand) as number;

    switch (operator) {
      case "in":
        return (operand as unknown[]).some((item) => comparable(item) === left);
      case "not":
        return isOperatorObject(operand)
          ? !matchesCondition(value, operand)
          : (left ?? null) !== (right ?? null);
      case "gt":
        return value != null && left > right;
      case "gte":
        return value != null && left >= right;
      case "lt":
        return value != null && left < right;
      case "lte":
        return value != null && left <= right;
      default:
        throw new Error(`in-memory prisma: unsupported operator "${operator}"`);
    }
  });
};

const matchesWhere = (row: Row, where: Where = {}): boolean =>
  Object.entries(where).every(([key, condition]) => {
    if (key === "OR") {
      return (condition as Where[]).some((clause) => matchesWhere(row, clause));
    }

    if (key === "AND") {
      return (condition as Where[]).every((clause) => matchesWhere(row, clause));
    }

    if (key.includes("_") && isOperatorObject(condition) && !(key in row)) {
      // Compound unique selector such as `cartId_learnerId`.
      return matchesWhere(row, condition);
    }

    return matchesCondition(row[key], condition);
  });

const sortRows = (rows: Row[], orderBy?: OrderBy): Row[] => {
  const clauses = orderBy ? (Array.isArray(orderBy) ? orderBy : [orderBy]) : [];

  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      for (const [field, direction] of Object.entries(clause)) {
        const left = comparable(a[field]) as number | string;
        const right = comparable(b[field]) as number | string;
        if (left === right) continue;
        const order = left < right ? -1 : 1;
        return direction === "desc" ? -order : order;
      }
    }
    return 0;
  });
};

const uniqueError = (target: string) =>
  Object.assign(new Error(`Unique constraint failed on the fields: (${target})`), {
    code: "P2002",
  });

export const createInMemoryPrisma = () => {
  const tables: Record<ModelName, Row[]> = {
    learner: [],
    sponsor: [],
    sponsorOrder: [],
    sponsorshipCart: [],
    sponsorshipCartItem: [],
  };

  let lastCreatedAt = 0;
  // Later rows always sort after earlier ones, like microsecond timestamps in Postgres.
  const nextCreatedAt = () => {
    lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1);
    return new Date(lastCreatedAt);
  };

  const defaults: Record<ModelName, () => Record<string, unknown>> = {
    learner: () => ({ imageUrl: null, sponsorId: null, sponsorshipEndsAt: null, standard: "5" }),
    sponsor: () => ({}),
    sponsorOrder: () => ({
      status: "PENDING",
      paymentSessionId: null,
      shareSlug: null,
      sponsorId: null,
      learnerId: null,
      paymentOrderId: null,
      cartId: null,
    }),
    sponsorshipCart: () => ({
      status: "DRAFT",
      plan: "monthly",
      orderId: null,
      checkoutKey: null,
      amount: null,
      paymentSessionId: null,
      checkoutStartedAt: null,
    }),
    sponsorshipCartItem: () => ({}),
  };

  const uniqueKeys: Record<ModelName, string[][]> = {
    learner: [],
    sponsor: [],
    sponsorOrder: [["orderId"], ["shareSlug"]],
    sponsorshipCart: [["orderId"]],
    sponsorshipCartItem: [["cartId", "learnerId"]],
  };

  const byId = (model: ModelName, id: unknown) =>
    tables[model].find((row) => row.id === id) ?? null;

  const relations: Record<ModelName, Record<string, Relation>> = {
    learner: {},
    sponsor: {},
    sponsorOrder: {
      learner: { model: "learner", resolve: (row) => byId("learner", row.learnerId) },
      sponsor: { model: "sponsor", resolve: (row) => byId("sponsor", row.sponsorId) },
      cart: { model: "sponsorshipCart", resolve: (row) => byId("sponsorshipCart", row.cartId) },
    },
    sponsorshipCart: {
      items: {
        model: "sponsorshipCartItem",
        resolve: (row) =>
          sortRows(
            tables.sponsorshipCartItem.filter((item) => item.cartId === row.id),
            { createdAt: "asc" },
          ),
      },
      orders: {
        model: "sponsorOrder",
        resolve: (row) => tables.sponsorOrder.filter((order) => order.cartId === row.id),
      },
    },
    sponsorshipCartItem: {
      learner: { model: "learner", resolve: (row) => byId("learner", row.learnerId) },
      cart: { model: "sponsorshipCart", resolve: (row) => byId("sponsorshipCart", row.cartId) },
    },
  };

  const project = (model: ModelName, row: Row, spec: Spec): Row => {
    const result: Row = { ...row };

    for (const [key, value] of Object.entries(spec ?? {})) {
      if (key === "_count") {
        const countSpec = (value as { select: Record<string, boolean> }).select;
        result._count = Object.fromEntries(
          Object.keys(countSpec).map((relation) => {
            const related = relations[model][relation].resolve(row);
            return [relation, Array.isArray(related) ? related.length : related ? 1 : 0];
          }),
        );
        continue;
      }

      const relation = relations[model][key];
      if (!relation || !value) continue;

      const nested = value === true ? undefined : (value as Record<string, unknown>);
      const nestedSpec = (nested?.select ?? nested?.include) as Spec;
      const related = relation.resolve(row);

      if (Array.isArray(related)) {
        const ordered = nested?.orderBy ? sortRows(related, nested.orderBy as OrderBy) : related;
        result[key] = ordered.map((item) => project(relation.model, item, nestedSpec));
      } else {
        result[key] = related ? project(relation.model, related, nestedSpec) : null;
      }
    }

    return result;
  };

  const assertUnique = (model: ModelName, candidate: Row) => {
    for (const fields of uniqueKeys[model]) {
      if (fields.some((field) => candidate[field] == null)) continue;

      const clash = tables[model].some(
        (row) =>
          row.id !== candidate.id && fields.every((field) => row[field] === candidate[field]),
      );

      if (clash) {
        throw uniqueError(fields.join(","));
      }
    }
  };

  const insert = (model: ModelName, data: Record<string, unknown>): Row => {
    const { items, ...scalars } = data as { items?: { create: Record<string, unknown>[] } };
    const row = {
      ...defaults[model](),
      id: randomUUID(),
      createdAt: nextCreatedAt(),
      ...scalars,
    } as Row;

    assertUnique(model, row);
    tables[model].push(row);

    if (model === "sponsorshipCart" && items?.create) {
      for (const item of items.create) {
        insert("sponsorshipCartItem", { ...item, cartId: row.id });
      }
    }

    return row;
  };

  const delegate = (model: ModelName) => {
    const find = ({ where, orderBy }: FindArgs = {}) =>
      sortRows(
        tables[model].filter((candidate) => matchesWhere(candidate, where)),
        orderBy,
      );

    const applyUpdate = (row: Row, data: Record<string, unknown>) => {
      assertUnique(model, { ...row, ...data });
      Object.assign(row, data);
    };

    return {
      findUnique: async ({ where, select, include }: FindArgs) => {
        const [row] = find({ where });
        return row ? project(model, row, select ?? include) : null;
      },
      findFirst: async (args: FindArgs = {}) => {
        const [row] = find(args);
        return row ? project(model, row, args.select ?? args.include) : null;
      },
      findMany: async (args: FindArgs = {}) => {
        const matched = find(args);
        return (args.take === undefined ? matched : matched.slice(0, args.take)).map((row) =>
          project(model, row, args.select ?? args.include),
        );
      },
      count: async ({ where }: FindArgs = {}) => find({ where }).length,
      create: async ({ data, select, include }: WriteArgs) =>
        project(model, insert(model, data), select ?? include),
      update: async ({ where, data, select, include }: WriteArgs) => {
        const [row] = find({ where });
        if (!row) {
          throw Object.assign(new Error("Record to update not found."), { code: "P2025" });
        }
        applyUpdate(row, data);
        return project(model, row, select ?? include);
      },
      updateMany: async ({ where, data }: WriteArgs) => {
        const matched = find({ where });
        matched.forEach((row) => applyUpdate(row, data));
        return { count: matched.length };
      },
      deleteMany: async ({ where }: FindArgs = {}) => {
        const before = tables[model].length;
        tables[model] = tables[model].filter((candidate) => !matchesWhere(candidate, where));
        return { count: before - tables[model].length };
      },
    };
  };

  const client = {
    learner: delegate("learner"),
    sponsor: delegate("sponsor"),
    sponsorOrder: delegate("sponsorOrder"),
    sponsorshipCart: delegate("sponsorshipCart"),
    sponsorshipCartItem: delegate("sponsorshipCartItem"),
    $transaction: async (operation: unknown): Promise<unknown> =>
      typeof operation === "function"
        ? (operation as (tx: unknown) => Promise<unknown>)(client)
        : Promise.all(operation as Promise<unknown>[]),
  };

  return {
    prisma: client as unknown as PrismaClient,
    client,
    tables,
    seedLearner: (data: Record<string, unknown> & { id: string; name: string }) =>
      insert("learner", data),
    seedSponsor: (data: Record<string, unknown> & { name: string; email: string }) =>
      insert("sponsor", data),
    seedCart: (data: Record<string, unknown> = {}) => insert("sponsorshipCart", data),
    seedCartItem: (cartId: string, learnerId: string) =>
      insert("sponsorshipCartItem", { cartId, learnerId }),
    seedOrder: (data: Record<string, unknown> & { orderId: string }) =>
      insert("sponsorOrder", {
        name: "Donor",
        email: "donor@example.com",
        phone: "9999999999",
        plan: "monthly",
        amount: 300,
        ...data,
      }),
  };
};

export type InMemoryPrisma = ReturnType<typeof createInMemoryPrisma>;
