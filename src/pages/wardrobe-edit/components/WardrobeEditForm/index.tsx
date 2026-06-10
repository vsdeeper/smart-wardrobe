import { useCallback, useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Add } from "@nutui/icons-react-taro";
import {
  ActionSheet,
  Dialog,
  Input,
  Tag,
  TextArea,
} from "@nutui/nutui-react-taro";
import type { ClothingType } from "@/data/wardrobe";
import "./index.scss";

const OUTFIT_PLACEHOLDER = "暂无搭配推荐，将在 AI 识别阶段生成";
const MAX_NAME_LENGTH = 30;
const MAX_TAGS = 8;
const NEW_CATEGORY_OPTION = "新建类别";

export interface WardrobeEditFormProps {
  name: string;
  typeName: string;
  tags: string[];
  outfitRecommendation: string;
  clothingTypes: ClothingType[];
  onNameChange: (value: string) => void;
  onTypeNameChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
  onOutfitRecommendationChange: (value: string) => void;
}

function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="sw-form-row">
      <Text className="sw-form-label">{label}</Text>
      <View className="sw-form-value">{children}</View>
    </View>
  );
}

export default function WardrobeEditForm({
  name,
  typeName,
  tags,
  outfitRecommendation,
  clothingTypes,
  onNameChange,
  onTypeNameChange,
  onTagsChange,
  onOutfitRecommendationChange,
}: WardrobeEditFormProps) {
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [newTypeDialogVisible, setNewTypeDialogVisible] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [tagDialogVisible, setTagDialogVisible] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const typeOptions = useMemo(
    () => [
      ...clothingTypes.map((type) => ({ name: type.name })),
      { name: NEW_CATEGORY_OPTION },
    ],
    [clothingTypes],
  );

  const openTypeSheet = useCallback(() => {
    setTypeSheetVisible(true);
  }, []);

  const closeTypeSheet = useCallback(() => {
    setTypeSheetVisible(false);
  }, []);

  const handleTypeSelect = useCallback(
    (option: { name?: string }) => {
      closeTypeSheet();
      if (option.name === NEW_CATEGORY_OPTION) {
        setNewTypeName("");
        setNewTypeDialogVisible(true);
        return;
      }
      if (option.name) {
        onTypeNameChange(option.name);
      }
    },
    [closeTypeSheet, onTypeNameChange],
  );

  const handleNewTypeConfirm = useCallback(() => {
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      Taro.showToast({ title: "请输入类别名称", icon: "none" });
      return;
    }
    onTypeNameChange(trimmed);
    setNewTypeDialogVisible(false);
    setNewTypeName("");
  }, [newTypeName, onTypeNameChange]);

  const handleNewTypeCancel = useCallback(() => {
    setNewTypeDialogVisible(false);
    setNewTypeName("");
  }, []);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((item) => item !== tag));
    },
    [onTagsChange, tags],
  );

  const tagAddDisabled = tags.length >= MAX_TAGS;

  const openTagDialog = useCallback(() => {
    if (tagAddDisabled) {
      Taro.showToast({ title: `最多 ${MAX_TAGS} 个标签`, icon: "none" });
      return;
    }
    setTagInput("");
    setTagDialogVisible(true);
  }, [tagAddDisabled]);

  const handleTagDialogCancel = useCallback(() => {
    setTagDialogVisible(false);
    setTagInput("");
  }, []);

  const handleTagDialogConfirm = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed) {
      Taro.showToast({ title: "请输入标签", icon: "none" });
      return;
    }
    if (tags.length >= MAX_TAGS) return;
    if (tags.includes(trimmed)) {
      Taro.showToast({ title: "标签已存在", icon: "none" });
      return;
    }
    onTagsChange([...tags, trimmed]);
    setTagDialogVisible(false);
    setTagInput("");
  }, [onTagsChange, tagInput, tags]);

  return (
    <View className="wardrobe-edit-form">
      <FormRow label="名称">
        <View className="sw-field-input">
          <Input
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="请输入名称"
            onChange={onNameChange}
          />
        </View>
      </FormRow>

      <FormRow label="类别">
        <View className="sw-field-select" onClick={openTypeSheet}>
          <Text
            className={[
              "sw-field-select__text",
              !typeName && "sw-field-select__text--placeholder",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {typeName || "请选择类别"}
          </Text>
          <Text className="sw-field-select__arrow">›</Text>
        </View>
      </FormRow>

      <FormRow label="标签">
        <View className="wardrobe-edit-form__tags">
          {tags.map((tag) => (
            <Tag
              key={tag}
              round
              closeable
              className="sw-tag"
              background="var(--sw-color-tag-bg)"
              color="var(--sw-color-tag-text)"
              onClose={() => handleRemoveTag(tag)}
            >
              {tag}
            </Tag>
          ))}
          <View
            className={[
              "sw-tag",
              "sw-tag--add",
              tagAddDisabled && "sw-tag--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={openTagDialog}
          >
            <Text className="sw-tag__text">添加</Text>
            <View className="sw-tag__icon">
              <Add color="currentColor" />
            </View>
          </View>
        </View>
      </FormRow>

      <View className="wardrobe-edit-form__outfit">
        <Text className="sw-form-label">搭配推荐</Text>
        <View className="sw-field-box">
          <TextArea
            value={outfitRecommendation}
            placeholder={OUTFIT_PLACEHOLDER}
            autoSize
            onChange={onOutfitRecommendationChange}
          />
        </View>
      </View>

      <ActionSheet
        visible={typeSheetVisible}
        options={typeOptions}
        cancelText="取消"
        onSelect={handleTypeSelect}
        onCancel={closeTypeSheet}
        onClose={closeTypeSheet}
      />

      <Dialog
        title="新建类别"
        visible={newTypeDialogVisible}
        confirmText="确定"
        cancelText="取消"
        onConfirm={handleNewTypeConfirm}
        onCancel={handleNewTypeCancel}
        onClose={handleNewTypeCancel}
      >
        <View className="sw-field-input wardrobe-edit-form__dialog-input">
          <Input
            value={newTypeName}
            maxLength={20}
            placeholder="请输入类别名称"
            onChange={setNewTypeName}
          />
        </View>
      </Dialog>

      <Dialog
        title="添加标签"
        visible={tagDialogVisible}
        confirmText="确定"
        cancelText="取消"
        onConfirm={handleTagDialogConfirm}
        onCancel={handleTagDialogCancel}
        onClose={handleTagDialogCancel}
      >
        <View className="sw-field-input wardrobe-edit-form__dialog-input">
          <Input
            value={tagInput}
            maxLength={20}
            placeholder="请输入标签"
            confirmType="done"
            onChange={setTagInput}
            onConfirm={handleTagDialogConfirm}
          />
        </View>
      </Dialog>
    </View>
  );
}
