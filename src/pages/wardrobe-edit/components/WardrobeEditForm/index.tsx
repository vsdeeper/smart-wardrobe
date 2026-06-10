import { useCallback, useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
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

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.length >= MAX_TAGS) return;
    if (tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    onTagsChange([...tags, trimmed]);
    setTagInput("");
  }, [onTagsChange, tagInput, tags]);

  const tagInputDisabled = tags.length >= MAX_TAGS;

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
          <View className="sw-field-input sw-field-input--sm wardrobe-edit-form__tag-input">
            <Input
              value={tagInput}
              disabled={tagInputDisabled}
              placeholder={
                tagInputDisabled ? `最多 ${MAX_TAGS} 个标签` : "输入后回车添加"
              }
              confirmType="done"
              onChange={setTagInput}
              onConfirm={handleAddTag}
            />
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
    </View>
  );
}
