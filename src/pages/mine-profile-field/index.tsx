import { View } from "@tarojs/components";
import AppNavbar from "@/components/AppNavbar";
import OutlineButton from "@/components/OutlineButton";
import PageLoading from "@/components/PageLoading";
import SolidButton from "@/components/SolidButton";
import { useMineProfileFieldEdit } from "@/hooks/use-mine-profile-field-edit";
import Main from "@/layouts/Main";
import FieldInput from "./components/FieldInput";
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
          {loading || !field || !fieldMeta ? (
            <PageLoading />
          ) : (
            <FieldInput
              field={field}
              fieldMeta={fieldMeta}
              updating={updating}
              textDraft={textDraft}
              setTextDraft={setTextDraft}
              genderDraft={genderDraft}
              setGenderDraft={setGenderDraft}
            />
          )}
        </View>
      </Main.Scroll>

      {!loading && field ? (
        <View className="sw-action-bar">
          <OutlineButton block disabled={updating} onClick={handleBack}>
            取消
          </OutlineButton>
          <SolidButton
            block
            loading={updating}
            disabled={!canSaveGender}
            onClick={handleSave}
          >
            保存
          </SolidButton>
        </View>
      ) : null}
    </Main>
  );
}

export default MineProfileFieldPage;
