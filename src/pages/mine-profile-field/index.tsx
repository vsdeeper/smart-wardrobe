import { View, Text } from "@tarojs/components";
import { Cell, Input as NutInput, Loading } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import PageLoading from "@/components/PageLoading";
import { GENDER_OPTIONS } from "@/data/profile";
import { useMineProfileFieldEdit } from "@/hooks/useMineProfileFieldEdit";
import Main from "@/layouts/Main";
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
    canSaveGender,
    handleBack,
    handleSave,
  } = useMineProfileFieldEdit();

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
    <Main
      showTabbar={false}
      scrollClassName={
        !loading && field ? "main-scroll--mine-profile-field" : undefined
      }
      header={
        <AppNavbar
          showBack
          title={fieldMeta?.title ?? "编辑资料"}
          onBack={handleBack}
        />
      }
    >
      <Main.Scroll>
        <View className="mine-profile-field-page">
          {loading || !field ? (
            <PageLoading />
          ) : (
            renderFieldInput()
          )}
        </View>
      </Main.Scroll>

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
              !canSaveGender && !updating && "sw-btn--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={updating || !canSaveGender ? undefined : handleSave}
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
    </Main>
  );
}

export default MineProfileFieldPage;
