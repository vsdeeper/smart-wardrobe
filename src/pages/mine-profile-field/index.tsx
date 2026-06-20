import { View, Text, ScrollView, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Cell, Input as NutInput, Loading, NavBar } from "@nutui/nutui-react-taro";
import { GENDER_OPTIONS } from "@/data/profile";
import { useMineProfileFieldEdit } from "@/hooks/useMineProfileFieldEdit";
import "./index.scss";

function MineProfileFieldPage() {
  const {
    field,
    fieldMeta,
    loading,
    updating,
    textDraft,
    setTextDraft,
    genderDraft,
    setGenderDraft,
    handleBack,
    handleSave,
  } = useMineProfileFieldEdit();

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  const renderFieldInput = () => {
    if (!field || !fieldMeta) return null;

    if (field === "gender") {
      return (
        <Cell.Group className="mine-profile-field-page__group">
          {GENDER_OPTIONS.map((option) => {
            const selected = genderDraft === option.value;
            return (
              <Cell
                key={option.value}
                className={
                  selected
                    ? "mine-profile-field-gender-cell mine-profile-field-gender-cell--selected"
                    : "mine-profile-field-gender-cell"
                }
                title={
                  <Text className="mine-profile-field-gender-cell__label">
                    {option.label}
                  </Text>
                }
                extra={
                  selected ? (
                    <Text className="mine-profile-field-gender-cell__check">
                      ✓
                    </Text>
                  ) : undefined
                }
                onClick={() => setGenderDraft(option.value)}
              />
            );
          })}
        </Cell.Group>
      );
    }

    if (field === "nickname") {
      return (
        <View>
          <View className="sw-field-input">
            <Input
              type="nickname"
              value={textDraft}
              placeholder={fieldMeta.placeholder}
              disabled={updating}
              focus
              onInput={(e) => setTextDraft(e.detail.value)}
            />
          </View>
        </View>
      );
    }

    if (field === "height" || field === "weight") {
      return (
        <View>
          <View className="sw-field-input">
            <NutInput
              value={textDraft}
              type="digit"
              placeholder={fieldMeta.placeholder}
              disabled={updating}
              onChange={setTextDraft}
            />
          </View>
          {fieldMeta.hint ? (
            <Text className="mine-profile-field-page__hint">
              {fieldMeta.hint}
            </Text>
          ) : null}
        </View>
      );
    }

    return (
      <View className="sw-field-input">
        <NutInput
          value={textDraft}
          placeholder={fieldMeta.placeholder}
          disabled={updating}
          onChange={setTextDraft}
        />
      </View>
    );
  };

  return (
    <View
      className="mine-profile-field-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="mine-profile-field-page__navbar"
        back={<Text className="mine-profile-field-page__back">返回</Text>}
        onBackClick={handleBack}
      >
        <Text className="mine-profile-field-page__title">
          {fieldMeta?.title ?? "编辑资料"}
        </Text>
      </NavBar>

      <ScrollView
        className="mine-profile-field-page__scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        {loading || !field ? (
          <View className="mine-profile-field-page__state">
            <Loading type="circular" />
          </View>
        ) : (
          renderFieldInput()
        )}
      </ScrollView>

      {!loading && field ? (
        <View className="sw-action-bar">
          <View
            className={[
              "sw-btn sw-btn--block sw-btn--secondary",
              updating && "sw-btn--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleBack}
          >
            <Text className="sw-btn__text">取消</Text>
          </View>
          <View
            className={[
              "sw-btn sw-btn--block sw-btn--primary",
              updating && "sw-btn--loading",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleSave}
          >
            {updating ? (
              <Loading
                type="circular"
                color="var(--sw-color-on-primary)"
                className="sw-btn-loading"
              />
            ) : (
              <Text className="sw-btn__text sw-btn__text--primary">保存</Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default MineProfileFieldPage;
