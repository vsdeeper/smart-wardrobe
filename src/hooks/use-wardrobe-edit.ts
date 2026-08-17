import {
  ClothingType,
  RecognizedPreviewItem,
  WardrobeItem,
} from "@/types/wardrobe";
import { useCallback, useEffect, useRef, useState } from "react";
import { isWeapp } from "@/utils/platform";
import Taro, { useLoad } from "@tarojs/taro";

import {
  getRecognitionSessionItem,
  updateRecognitionSessionItem,
} from "@/services/recognition-session";
import { putImageUrlCache } from "@/services/image-url-cache";
import {
  fetchClothingTypes,
  fetchWardrobeItemById,
  updateWardrobeItem,
} from "@/services/wardrobe";
import {
  applyWardrobeItemUpdate,
  setPendingWardrobeListPatch,
} from "@/services/wardrobe-cache";
import { afterToastNavigate } from "@/utils/after-toast-navigate";
import { toUserMessage } from "@/utils/error-message";

function recognitionItemToDisplayItem(
  preview: RecognizedPreviewItem
): WardrobeItem {
  if (preview.imageFileId && preview.imageUrl) {
    putImageUrlCache(
      "wardrobe",
      preview.imageFileId,
      preview.imageUrl,
      Date.now()
    );
  }
  return {
    _id: preview.tempId,
    name: preview.name,
    typeId: "",
    typeName: preview.typeName,
    imageFileId: preview.imageFileId,
    tags: preview.tags,
    stylingAdvice: preview.stylingAdvice,
    createdAt: Date.now(),
  };
}
export function useWardrobeEdit() {
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [name, setName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [stylingAdvice, setStylingAdvice] = useState("");
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
    setStylingAdvice(item.stylingAdvice ?? "");
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

    if (!isWeapp()) {
      Taro.showToast({ title: "请在微信小程序中使用", icon: "none" });
      return;
    }

    setSaving(true);
    try {
      if (isRecognitionMode) {
        const original = recognitionOriginalRef.current;
        if (!original) {
          throw new Error("识别结果已过期，请重新识别");
        }

        updateRecognitionSessionItem({
          ...original,
          name: trimmedName,
          typeName: trimmedTypeName,
          tags,
          stylingAdvice: original.stylingAdvice,
        });
        Taro.showToast({ title: "已保存", icon: "success" });
        afterToastNavigate(() => Taro.navigateBack());
        return;
      }

      const previousTypeId = item.typeId;
      const updated = await updateWardrobeItem({
        _id: item._id,
        name: trimmedName,
        typeName: trimmedTypeName,
        tags,
        previousTypeId,
      });
      applyWardrobeItemUpdate(updated, previousTypeId);
      setPendingWardrobeListPatch({
        kind: "update",
        item: updated,
        previousTypeId,
      });
      Taro.showToast({ title: "已保存", icon: "success" });
      afterToastNavigate(() => Taro.navigateBack());
    } catch (err) {
      const message = toUserMessage(err, "保存失败，请稍后重试");
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setSaving(false);
    }
  }, [saving, item, name, typeName, tags, isRecognitionMode]);

  useLoad((options) => {
    const source = options.source;
    const tempId = options.tempId;
    const id = options.id;

    if (source === "recognition") {
      if (!tempId) {
        Taro.showToast({
          title: "暂时打不开识别结果，请返回重试",
          icon: "none",
        });
        Taro.navigateBack();
        return;
      }

      if (!isWeapp()) {
        setLoading(false);
        setError("请在微信小程序中使用");
        return;
      }

      const preview = getRecognitionSessionItem(tempId);
      if (!preview) {
        Taro.showToast({
          title: "识别结果已过期，请重新识别",
          icon: "none",
        });
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
          const message = toUserMessage(err, "编辑信息加载失败，请稍后重试");
          setError(message);
          Taro.showToast({ title: message, icon: "none" });
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

    if (!id) {
      Taro.showToast({ title: "暂时打不开编辑页，请返回重试", icon: "none" });
      Taro.navigateBack();
      return;
    }

    if (!isWeapp()) {
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
        const message = toUserMessage(err, "编辑信息加载失败，请稍后重试");
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
    stylingAdvice,
    loading,
    saving,
    error,
    isRecognitionMode,
    setName,
    setTypeName,
    setTags,
    handleCancel,
    handleSave,
  };
}
