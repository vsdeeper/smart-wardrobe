export interface InboundRefreshPayload {
  typeIds: string[];
  typeNames: string[];
  at: number;
}

type InboundRefreshListener = (
  payload: InboundRefreshPayload | null,
) => void;

let payload: InboundRefreshPayload | null = null;
const listeners = new Set<InboundRefreshListener>();

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function mergeUnique(prev: string[], next: string[]): string[] {
  return uniqueStrings([...prev, ...next]);
}

function notify(): void {
  listeners.forEach((listener) => listener(payload));
}

export function getInboundRefresh(): InboundRefreshPayload | null {
  return payload;
}

/** 写入入库刷新信号；多次写入合并 typeIds / typeNames */
export function setInboundRefresh(input: {
  typeIds: string[];
  typeNames: string[];
}): void {
  const typeIds = uniqueStrings(input.typeIds);
  const typeNames = uniqueStrings(input.typeNames);
  if (typeIds.length === 0 && typeNames.length === 0) return;

  if (!payload) {
    payload = {
      typeIds,
      typeNames,
      at: Date.now(),
    };
  } else {
    payload = {
      typeIds: mergeUnique(payload.typeIds, typeIds),
      typeNames: mergeUnique(payload.typeNames, typeNames),
      at: Date.now(),
    };
  }
  notify();
}

export function clearInboundRefresh(): void {
  if (!payload) return;
  payload = null;
  notify();
}

/**
 * 部分消费：从信号中移除已处理的 typeId / typeName。
 * 若无剩余则清空整条信号。
 */
export function consumeInboundRefreshTypes(input: {
  typeIds?: string[];
  typeNames?: string[];
}): void {
  if (!payload) return;

  const removeIds = new Set(uniqueStrings(input.typeIds ?? []));
  const removeNames = new Set(uniqueStrings(input.typeNames ?? []));
  if (removeIds.size === 0 && removeNames.size === 0) return;

  const typeIds = payload.typeIds.filter((id) => !removeIds.has(id));
  const typeNames = payload.typeNames.filter((name) => !removeNames.has(name));

  if (typeIds.length === 0 && typeNames.length === 0) {
    payload = null;
  } else {
    payload = {
      typeIds,
      typeNames,
      at: payload.at,
    };
  }
  notify();
}

/** 订阅入库刷新信号；注册时立即同步当前值，返回取消订阅函数 */
export function subscribeInboundRefresh(
  listener: InboundRefreshListener,
): () => void {
  listeners.add(listener);
  listener(payload);
  return () => {
    listeners.delete(listener);
  };
}
