export const MINE_RECOGNITION_PREVIEW_LIMIT = 5;

export const RECOGNITION_HISTORY_PAGE_SIZE = 20;

/** 有 processing 批次时轮询间隔（ms） */
export const RECOGNITION_POLL_INTERVAL_MS = 5000;

/** 识别中超时兜底：略长于云函数 timeout 300s */
export const RECOGNITION_STALE_MS = 6 * 60 * 1000;
