import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Add, ArrowRight } from "@nutui/icons-react-taro";
import {
  ActionSheet,
  Dialog,
  Input,
  Tag,
  TextArea,
} from "@nutui/nutui-react-taro";
import type { ClothingType } from "@/data/wardrobe";
import "./index.scss";

function FormDialogFooter({
  cancelText = "取消",
  confirmText = "确定",
  onCancel,
  onConfirm,
}: {
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View className="sw-dialog-footer">
      <View
        className="sw-dialog-footer__btn sw-dialog-footer__btn--cancel"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
      >
        <Text className="sw-dialog-footer__text">{cancelText}</Text>
      </View>
      <View
        className="sw-dialog-footer__btn sw-dialog-footer__btn--confirm"
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
      >
        <Text className="sw-dialog-footer__text sw-dialog-footer__text--confirm">
          {confirmText}
        </Text>
      </View>
    </View>
  );
}

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
  hideOutfitRecommendation?: boolean;
  onNameChange: (value: string) => void;
  onTypeNameChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
  onOutfitRecommendationChange: (value: string) => void;
}

interface WardrobeEditFormContextValue {
  name: string;
  typeName: string;
  tags: string[];
  outfitRecommendation: string;
  hideOutfitRecommendation: boolean;
  tagAddDisabled: boolean;
  onNameChange: (value: string) => void;
  onOutfitRecommendationChange: (value: string) => void;
  openTypeSheet: () => void;
  openTagDialog: () => void;
  handleRemoveTag: (tag: string) => void;
  typeSheetVisible: boolean;
  typeOptions: { name: string }[];
  closeTypeSheet: () => void;
  handleTypeSelect: (option: { name?: string }) => void;
  newTypeDialogVisible: boolean;
  newTypeName: string;
  setNewTypeName: (value: string) => void;
  handleNewTypeConfirm: () => void;
  handleNewTypeCancel: () => void;
  tagDialogVisible: boolean;
  tagInput: string;
  setTagInput: (value: string) => void;
  handleTagDialogConfirm: () => void;
  handleTagDialogCancel: () => void;
}

const WardrobeEditFormContext =
  createContext<WardrobeEditFormContextValue | null>(null);

function useWardrobeEditFormContext() {
  const context = useContext(WardrobeEditFormContext);
  if (!context) {
    throw new Error(
      "WardrobeEditForm 子组件必须在 WardrobeEditFormProvider 内使用"
    );
  }
  return context;
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="sw-form-row">
      <Text className="sw-form-label">{label}</Text>
      <View className="sw-form-value">{children}</View>
    </View>
  );
}

export function WardrobeEditFormProvider({
  name,
  typeName,
  tags,
  outfitRecommendation,
  clothingTypes,
  hideOutfitRecommendation = false,
  onNameChange,
  onTypeNameChange,
  onTagsChange,
  onOutfitRecommendationChange,
  children,
}: WardrobeEditFormProps & { children: ReactNode }) {
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
    [clothingTypes]
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
    [closeTypeSheet, onTypeNameChange]
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
    [onTagsChange, tags]
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

  const value = useMemo<WardrobeEditFormContextValue>(
    () => ({
      name,
      typeName,
      tags,
      outfitRecommendation,
      hideOutfitRecommendation,
      tagAddDisabled,
      onNameChange,
      onOutfitRecommendationChange,
      openTypeSheet,
      openTagDialog,
      handleRemoveTag,
      typeSheetVisible,
      typeOptions,
      closeTypeSheet,
      handleTypeSelect,
      newTypeDialogVisible,
      newTypeName,
      setNewTypeName,
      handleNewTypeConfirm,
      handleNewTypeCancel,
      tagDialogVisible,
      tagInput,
      setTagInput,
      handleTagDialogConfirm,
      handleTagDialogCancel,
    }),
    [
      name,
      typeName,
      tags,
      outfitRecommendation,
      hideOutfitRecommendation,
      tagAddDisabled,
      onNameChange,
      onOutfitRecommendationChange,
      openTypeSheet,
      openTagDialog,
      handleRemoveTag,
      typeSheetVisible,
      typeOptions,
      closeTypeSheet,
      handleTypeSelect,
      newTypeDialogVisible,
      newTypeName,
      handleNewTypeConfirm,
      handleNewTypeCancel,
      tagDialogVisible,
      tagInput,
      handleTagDialogConfirm,
      handleTagDialogCancel,
    ]
  );

  return (
    <WardrobeEditFormContext.Provider value={value}>
      {children}
    </WardrobeEditFormContext.Provider>
  );
}

export function WardrobeEditFormFields() {
  const {
    name,
    typeName,
    tags,
    outfitRecommendation,
    hideOutfitRecommendation,
    tagAddDisabled,
    onNameChange,
    onOutfitRecommendationChange,
    openTypeSheet,
    openTagDialog,
    handleRemoveTag,
  } = useWardrobeEditFormContext();

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
          <ArrowRight
            className="sw-field-select__arrow"
            color="var(--sw-field-placeholder-color)"
            size={8}
          />
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

      {!hideOutfitRecommendation && (
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
      )}
    </View>
  );
}

export function WardrobeEditFormOverlays() {
  const {
    typeSheetVisible,
    typeOptions,
    closeTypeSheet,
    handleTypeSelect,
    newTypeDialogVisible,
    newTypeName,
    setNewTypeName,
    handleNewTypeConfirm,
    handleNewTypeCancel,
    tagDialogVisible,
    tagInput,
    setTagInput,
    handleTagDialogConfirm,
    handleTagDialogCancel,
  } = useWardrobeEditFormContext();

  return (
    <>
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
        footer={null}
        closeOnOverlayClick
        onClose={handleNewTypeCancel}
      >
        <View className="sw-dialog-body">
          <View className="sw-field-input sw-dialog-body__input">
            <Input
              value={newTypeName}
              maxLength={20}
              placeholder="请输入类别名称"
              onChange={setNewTypeName}
            />
          </View>
          <FormDialogFooter
            onCancel={handleNewTypeCancel}
            onConfirm={handleNewTypeConfirm}
          />
        </View>
      </Dialog>

      <Dialog
        title="添加标签"
        visible={tagDialogVisible}
        footer={null}
        closeOnOverlayClick
        onClose={handleTagDialogCancel}
      >
        <View className="sw-dialog-body">
          <View className="sw-field-input sw-dialog-body__input">
            <Input
              value={tagInput}
              maxLength={20}
              placeholder="请输入标签"
              confirmType="done"
              onChange={setTagInput}
              onConfirm={handleTagDialogConfirm}
            />
          </View>
          <FormDialogFooter
            onCancel={handleTagDialogCancel}
            onConfirm={handleTagDialogConfirm}
          />
        </View>
      </Dialog>
    </>
  );
}

export default function WardrobeEditForm(props: WardrobeEditFormProps) {
  return (
    <WardrobeEditFormProvider {...props}>
      <WardrobeEditFormFields />
      <WardrobeEditFormOverlays />
    </WardrobeEditFormProvider>
  );
}
