import { CUSTOM_TRYON_MODEL_MAX } from "@/constants/try-on-model";
import {
  TRYON_MODEL_CREDIT_COST,
  generateTryOnModel,
  uploadTryOnModelSource,
} from "@/services/try-on-model";
import { fetchCreditBalance } from "@/services/credits";
import { resolveTempFileUrls } from "@/services/cloud-file";
import {
  getFreshUrlMap,
  getCachedImageUrl,
  mergeImageUrlCache,
  resolvedUrlMapToEntries,
} from "@/services/image-url-cache";
import { useUserProfile } from "@/hooks/use-user-profile";
import { isGenderSet } from "@/utils/profile";
import {
  buildTryOnModelGalleryItems,
  isTryOnModelItemActive,
  toActiveTryOnModel,
  type TryOnModelGalleryItem,
} from "@/utils/try-on-model";
import {
  canAffordTryOnModel,
  CREDITS_INSUFFICIENT_TOAST,
  isInsufficientCreditsPayload,
  resolveCreditsToastMessage,
} from "@/utils/credits";
import { getMediaPickerErrorToast } from "@/utils/media-picker-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";

/**
 * 试穿模特页：图库列表、选中/启用、预览、上传生成、删除自定义。
 */
export function useMineTryOnModel() {
  const { profile, loading, updating, updateProfile } = useUserProfile();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [urlReady, setUrlReady] = useState(false);

  const genderReady = isGenderSet(profile.gender);

  const galleryItems = useMemo<TryOnModelGalleryItem[]>(() => {
    if (!genderReady) return [];
    return buildTryOnModelGalleryItems(
      profile.gender!,
      profile.customTryOnModels ?? [],
    );
  }, [genderReady, profile.customTryOnModels, profile.gender]);

  const fileIds = useMemo(
    () => galleryItems.map((item) => item.fileId).filter(Boolean),
    [galleryItems],
  );

  useEffect(() => {
    if (fileIds.length === 0) {
      setUrlReady(true);
      return;
    }

    let cancelled = false;
    setUrlReady(false);

    void (async () => {
      const known = getFreshUrlMap("tryOnModel", fileIds);
      const resolved = await resolveTempFileUrls(fileIds, known);
      mergeImageUrlCache(
        "tryOnModel",
        resolvedUrlMapToEntries(resolved),
      );
      if (!cancelled) setUrlReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [fileIds]);

  const previewImages = useMemo(
    () =>
      galleryItems.map((item) => ({
        src: getCachedImageUrl("tryOnModel", item.fileId) || item.fileId,
      })),
    [galleryItems],
  );

  const handleSelect = useCallback((item: TryOnModelGalleryItem) => {
    setSelectedKey(item.key);
  }, []);

  const handleEnable = useCallback(async () => {
    if (!selectedKey) {
      Taro.showToast({ title: "请先选择模特", icon: "none" });
      return;
    }

    const item = galleryItems.find((entry) => entry.key === selectedKey);
    if (!item) return;

    const active = toActiveTryOnModel(item);
    if (
      profile.activeTryOnModel &&
      isTryOnModelItemActive(item, profile.activeTryOnModel)
    ) {
      Taro.showToast({ title: "已是当前启用模特", icon: "none" });
      return;
    }

    const ok = await updateProfile({ activeTryOnModel: active });
    if (ok) {
      Taro.showToast({ title: "已启用", icon: "success" });
    }
  }, [galleryItems, profile.activeTryOnModel, selectedKey, updateProfile]);

  const handlePreview = useCallback(() => {
    if (galleryItems.length === 0) {
      Taro.showToast({ title: "暂无模特可预览", icon: "none" });
      return;
    }

    const index = selectedKey
      ? galleryItems.findIndex((item) => item.key === selectedKey)
      : 0;
    setPreviewIndex(index >= 0 ? index : 0);
    setPreviewVisible(true);
  }, [galleryItems, selectedKey]);

  const handleClosePreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!genderReady || generating) return;

    const customCount = profile.customTryOnModels?.length ?? 0;
    if (customCount >= CUSTOM_TRYON_MODEL_MAX) {
      Taro.showToast({
        title: "最多保留 3 张，请先删除",
        icon: "none",
      });
      return;
    }

    try {
      const creditSummary = await fetchCreditBalance();
      if (!canAffordTryOnModel(creditSummary.available)) {
        Taro.showToast({
          title: CREDITS_INSUFFICIENT_TOAST,
          icon: "none",
          duration: 3000,
        });
        return;
      }

      let filePath: string | undefined;
      try {
        const chooseRes = await Taro.chooseMedia({
          count: 1,
          mediaType: ["image"],
          sourceType: ["album", "camera"],
        });
        filePath = chooseRes.tempFiles[0]?.tempFilePath;
      } catch (pickErr) {
        const toast = getMediaPickerErrorToast(pickErr);
        if (toast) Taro.showToast({ title: toast, icon: "none" });
        return;
      }

      if (!filePath) return;

      setGenerating(true);
      Taro.showLoading({ title: "生成中...", mask: true });

      const sourceFileId = await uploadTryOnModelSource(filePath);
      const result = await generateTryOnModel({
        sourceFileId,
        gender: profile.gender!,
      });

      if (result.error) {
        throw new Error(
          resolveCreditsToastMessage(
            result.message || result.error,
            result.error,
          ),
        );
      }

      if (!result.fileId) {
        throw new Error("模特图没能生成，请稍后重试");
      }

      const nextCustom = [
        {
          fileId: result.fileId,
          createdAt: Date.now(),
          // 记录生成时检测到的人物性别，供试穿时做性别一致性校验
          ...(result.gender ? { gender: result.gender } : {}),
        },
        ...(profile.customTryOnModels ?? []),
      ].slice(0, CUSTOM_TRYON_MODEL_MAX);

      const ok = await updateProfile({ customTryOnModels: nextCustom });
      if (!ok) return;

      if (result.coverUrl) {
        mergeImageUrlCache("tryOnModel", [
          { fileId: result.fileId, url: result.coverUrl, at: Date.now() },
        ]);
      }

      setSelectedKey(result.fileId);
      Taro.showToast({ title: "生成成功", icon: "success" });
    } catch (err) {
      const payload =
        err instanceof Error
          ? { message: err.message, error: undefined as string | undefined }
          : { message: "生成失败，请稍后重试", error: undefined };
      if (isInsufficientCreditsPayload(payload)) {
        Taro.showToast({ title: CREDITS_INSUFFICIENT_TOAST, icon: "none" });
      } else {
        Taro.showToast({
          title: payload.message || "生成失败，请稍后重试",
          icon: "none",
        });
      }
    } finally {
      Taro.hideLoading();
      setGenerating(false);
    }
  }, [
    genderReady,
    generating,
    profile.customTryOnModels,
    profile.gender,
    updateProfile,
  ]);

  const handleDeleteCustom = useCallback(
    async (item: TryOnModelGalleryItem) => {
      if (item.source !== "custom") return;

      const res = await Taro.showModal({
        title: "删除本人模特",
        content: "删除后无法恢复，确定删除吗？",
        confirmText: "删除",
        confirmColor: "#C0392B",
      });
      if (!res.confirm) return;

      const nextCustom = (profile.customTryOnModels ?? []).filter(
        (entry) => entry.fileId !== item.fileId,
      );

      const patch: Partial<typeof profile> = {
        customTryOnModels: nextCustom,
      };

      if (profile.activeTryOnModel?.fileId === item.fileId) {
        patch.activeTryOnModel = undefined;
      }

      const ok = await updateProfile(patch);
      if (!ok) return;

      if (selectedKey === item.key) {
        setSelectedKey(null);
      }

      Taro.showToast({ title: "已删除", icon: "success" });
    },
    [
      profile,
      selectedKey,
      updateProfile,
    ],
  );

  const handleOpenGenderEdit = useCallback(() => {
    Taro.navigateTo({ url: "/pages/mine-profile-field/index?field=gender" });
  }, []);

  return {
    profile,
    loading,
    updating,
    generating,
    genderReady,
    galleryItems,
    urlReady,
    selectedKey,
    previewVisible,
    previewIndex,
    previewImages,
    creditCost: TRYON_MODEL_CREDIT_COST,
    customCount: profile.customTryOnModels?.length ?? 0,
    customMax: CUSTOM_TRYON_MODEL_MAX,
    activeTryOnModel: profile.activeTryOnModel,
    handleSelect,
    handleEnable,
    handlePreview,
    handleClosePreview,
    handleGenerate,
    handleDeleteCustom,
    handleOpenGenderEdit,
    isItemActive: (item: TryOnModelGalleryItem) =>
      isTryOnModelItemActive(item, profile.activeTryOnModel),
  };
}
