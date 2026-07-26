import { useCallback, useEffect, useRef, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import {
  MINE_RECOGNITION_PREVIEW_LIMIT,
  RECOGNITION_POLL_INTERVAL_MS,
  RECOGNITION_STALE_MS,
  type RecognitionBatch,
} from "@/data/recognition";
import {
  fetchRecognitionBatchCount,
  fetchRecognitionBatches,
  fetchRecognitionBatchesByIds,
  markRecognitionBatchFailed,
  mergeBatchCover,
} from "@/services/recognitionBatch";

interface UseRecognitionBatchesOptions {
  previewLimit?: number;
  pageSize?: number;
  enablePagination?: boolean;
}

function batchActivityAt(batch: RecognitionBatch): number {
  return batch.updatedAt ?? batch.createdAt;
}

export function useRecognitionBatches(
  options: UseRecognitionBatchesOptions = {},
) {
  const previewLimit =
    options.previewLimit ?? MINE_RECOGNITION_PREVIEW_LIMIT;
  const pageSize = options.pageSize ?? previewLimit;
  const enablePagination = options.enablePagination ?? false;

  const [batches, setBatches] = useState<RecognitionBatch[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);
  const pollingRef = useRef(false);
  const batchesRef = useRef<RecognitionBatch[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  batchesRef.current = batches;

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) {
        setLoading(true);
      }
      try {
        const limit = enablePagination
          ? Math.max(batchesRef.current.length, pageSize) || pageSize
          : previewLimit;
        const [data, count] = await Promise.all([
          fetchRecognitionBatches({ limit, skip: 0 }),
          fetchRecognitionBatchCount(),
        ]);
        setBatches(data);
        setTotalCount(count);
        if (enablePagination) {
          setHasMore(data.length < count);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error("[recognition-batches] refresh failed", err);
        if (!silent) {
          setBatches([]);
          setTotalCount(0);
          setHasMore(false);
          Taro.showToast({
            title: "识别记录加载失败，请稍后重试",
            icon: "none",
          });
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [enablePagination, pageSize, previewLimit],
  );

  const pollProcessing = useCallback(async () => {
    if (pollingRef.current) return;

    const processing = batchesRef.current.filter(
      (b) => b.status === "processing" && b._id,
    );

    if (processing.length === 0) {
      stopPolling();
      return;
    }

    pollingRef.current = true;
    try {
      const now = Date.now();
      const staleIds = processing
        .filter((b) => now - batchActivityAt(b) > RECOGNITION_STALE_MS)
        .map((b) => b._id);

      if (staleIds.length > 0) {
        await Promise.all(
          staleIds.map((id) =>
            markRecognitionBatchFailed(id, "识别时间有点长，请稍后再试"),
          ),
        );
      }

      const processingIds = processing.map((b) => b._id);
      const latest = await fetchRecognitionBatchesByIds(processingIds);
      if (latest.length === 0) return;

      const latestById = new Map(latest.map((b) => [b._id, b]));
      const prevById = new Map(
        batchesRef.current.map((b) => [b._id, b] as const),
      );

      const mergedList = await Promise.all(
        batchesRef.current.map(async (prev) => {
          const next = latestById.get(prev._id);
          if (!next) return prev;
          return mergeBatchCover(prevById.get(prev._id), next);
        }),
      );

      setBatches(mergedList);
    } catch (err) {
      console.warn("[recognition-batches] poll processing failed", err);
    } finally {
      pollingRef.current = false;
    }
  }, [stopPolling]);

  const loadMore = useCallback(async () => {
    if (!enablePagination || loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setListLoading(true);
    try {
      const next = await fetchRecognitionBatches({
        skip: batchesRef.current.length,
        limit: pageSize,
      });
      setBatches((prev) => [...prev, ...next]);
      setHasMore(next.length >= pageSize);
    } catch (err) {
      console.error("[recognition-batches] loadMore failed", err);
    } finally {
      loadingRef.current = false;
      setListLoading(false);
    }
  }, [enablePagination, hasMore, pageSize]);

  useDidShow(() => {
    void refresh();
  });

  const hasProcessing = batches.some((b) => b.status === "processing");

  useEffect(() => {
    stopPolling();
    if (!hasProcessing) return;

    pollTimerRef.current = setInterval(() => {
      void pollProcessing();
    }, RECOGNITION_POLL_INTERVAL_MS);

    return stopPolling;
  }, [hasProcessing, pollProcessing, stopPolling]);

  return {
    batches,
    totalCount,
    loading,
    listLoading,
    hasMore,
    refresh,
    loadMore,
  };
}
