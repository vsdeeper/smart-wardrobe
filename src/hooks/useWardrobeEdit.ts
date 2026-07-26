import { useCallback, useEffect, useRef, useState } from "react";
import Taro, { useLoad } from "@tarojs/taro";
import type { ClothingType, RecognizedPreviewItem, WardrobeItem } from "@/data/wardrobe";
import {
  getRecognitionSessionItem,
  updateRecognitionSessionItem,
} from "@/services/recognitionSession";
import {
  fetchClothingTypes,
  fetchWardrobeItemById,
  updateWardrobeItem,
} from "@/services/wardrobe";
import { afterToastNavigate } from "@/utils/afterToastNavigate";

function recognitionItemToDisplayItem(
  preview: RecognizedPreviewItem,
): WardrobeItem {
  return {
    _id: preview.tempId,
    name: preview.name,
    typeId: "",
    typeName: preview.typeName,
    imageFileId: preview.imageFileId,
    imageUrl: preview.imageUrl,
    tags: preview.tags,
    createdAt: Date.now(),
  };
}

export function useWardrobeEdit() {
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [name, setName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [outfitRecommendation, setOutfitRecommendation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecognitionMode, setIsRecognitionMode] = useState(false);

  const recognitionOriginalRef = useRef<RecognizedPreviewItem | null>(null);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setTypeName(item.typeName);
    setTags(item.tags ?? []);
    setOutfitRecommendation(item.outfitRecommendation ?? "");
  }, [item]);

  const handleCancel = useCallback(() => {
    Taro.navigateBack();
  }, []);

  const handleSave = useCallback(async () => {
    if (saving || !item) return;

    const trimmedName = name.trim();
    const trimmedTypeName = typeName.trim();

    if (!trimmedName) {
      Taro.showToast({ title: "请输入名称", icon: "none" });
      return;
    }
    if (!trimmedTypeName) {
      Taro.showToast({ title: "请选择类别", icon: "none" });
      return;
    }

    if (process.env.TARO_ENV !== "weapp") {
      Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
      return;
    }

    setSaving(true);
    try {
      if (isRecognitionMode) {
        const original = recognitionOriginalRef.current;
        if (!original) {
          throw new Error("识别数据已失效");
        }

        updateRecognitionSessionItem({
          ...original,
          name: trimmedName,
          typeName: trimmedTypeName,
          tags,
        });
        Taro.showToast({ title: "已保存", icon: "success" });
        afterToastNavigate(() => Taro.navigateBack());
        return;
      }

      await updateWardrobeItem({
        _id: item._id,
        name: trimmedName,
        typeName: trimmedTypeName,
        tags,
        outfitRecommendation: outfitRecommendation.trim(),
        previousTypeId: item.typeId,
      });
      Taro.showToast({ title: "已保存", icon: "success" });
      afterToastNavigate(() => Taro.navigateBack());
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失败";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    item,
    name,
    typeName,
    tags,
    outfitRecommendation,
    isRecognitionMode,
  ]);

  useLoad((options) => {
    const source = options.source;
    const tempId = options.tempId;
    const id = options.id;

    if (source === "recognition") {
      if (!tempId) {
        Taro.showToast({ title: "缺少识别项 ID", icon: "none" });
        Taro.navigateBack();
        return;
      }

      if (process.env.TARO_ENV !== "weapp") {
        setLoading(false);
        setError("请在微信小程序中使用");
        return;
      }

      const preview = getRecognitionSessionItem(tempId);
      if (!preview) {
        Taro.showToast({ title: "识别数据已失效", icon: "none" });
        Taro.navigateBack();
        return;
      }

      recognitionOriginalRef.current = preview;
      setIsRecognitionMode(true);

      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const types = await fetchClothingTypes();
          setClothingTypes(types);
          setItem(recognitionItemToDisplayItem(preview));
        } catch (err) {
          const message = err instanceof Error ? err.message : "加载失败";
          setError(message);
          Taro.showToast({ title: message, icon: "none" });
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    if (!id) {
      Taro.showToast({ title: "缺少衣物 ID", icon: "none" });
      Taro.navigateBack();
      return;
    }

    if (process.env.TARO_ENV !== "weapp") {
      setLoading(false);
      setError("请在微信小程序中使用");
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, types] = await Promise.all([
          fetchWardrobeItemById(id),
          fetchClothingTypes(),
        ]);
        setItem(data);
        setClothingTypes(types);
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载失败";
        setError(message);
        Taro.showToast({ title: message, icon: "none" });
      } finally {
        setLoading(false);
      }
    })();
  });

  return {
    item,
    clothingTypes,
    name,
    typeName,
    tags,
    outfitRecommendation,
    loading,
    saving,
    error,
    isRecognitionMode,
    setName,
    setTypeName,
    setTags,
    setOutfitRecommendation,
    handleCancel,
    handleSave,
  };
}
