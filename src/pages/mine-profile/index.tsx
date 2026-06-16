import { View, Text, ScrollView, Button, Input, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { ArrowRight } from "@nutui/icons-react-taro";
import {
  ActionSheet,
  Cell,
  Input as NutInput,
  Loading,
  NavBar,
} from "@nutui/nutui-react-taro";
import totoroSrc from "@/assets/images/totoro.png";
import {
  getGenderLabel,
  maskPhoneNumber,
} from "@/data/profile";
import { useMineProfileEdit } from "@/hooks/useMineProfileEdit";
import MineMetricDialog from "@/pages/mine/components/MineMetricDialog";
import "./index.scss";

const ICON_PRIMARY = "var(--nutui-brand-6)";

function MineProfilePage() {
  const {
    profile,
    avatarUrl,
    loading,
    updating,
    nicknameDraft,
    occupationDraft,
    setNicknameDraft,
    setOccupationDraft,
    genderSheetVisible,
    setGenderSheetVisible,
    genderActionOptions,
    metricDialog,
    metricDialogVisible,
    metricInitialValue,
    handleBack,
    handleChooseAvatar,
    handleNicknameBlur,
    handleOccupationBlur,
    handleGetPhoneNumber,
    handleGenderSelect,
    openGenderSheet,
    openMetricDialog,
    handleMetricClose,
    handleMetricConfirm,
  } = useMineProfileEdit();

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  const cellArrow = <ArrowRight color={ICON_PRIMARY} size={14} />;

  const phoneLabel = profile.phoneNumber
    ? maskPhoneNumber(profile.phoneNumber)
    : "点击授权";

  return (
    <View
      className="mine-profile-page"
      style={{
        ["--sw-status-bar-height" as string]: `${statusBarHeight ?? 0}px`,
        ["--sw-safe-area-bottom" as string]: `${safeAreaBottom}px`,
      }}
    >
      <NavBar
        safeAreaInsetTop
        className="mine-profile-page__navbar"
        back={<Text className="mine-profile-page__back">返回</Text>}
        onBackClick={handleBack}
      >
        <Text className="mine-profile-page__title">个人资料</Text>
      </NavBar>

      <ScrollView
        className="mine-profile-page__scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        {loading ? (
          <View className="mine-profile-page__state">
            <Loading type="circular" />
          </View>
        ) : (
          <Cell.Group className="mine-profile-page__group">
            <Cell
              title="头像"
              extra={
                <View className="mine-profile-cell__extra">
                  <Button
                    className="mine-profile-cell__avatar-btn"
                    openType="chooseAvatar"
                    onChooseAvatar={handleChooseAvatar}
                  >
                    <Image
                      className="mine-profile-cell__avatar-preview"
                      src={avatarUrl || totoroSrc}
                      mode="aspectFill"
                    />
                  </Button>
                  {cellArrow}
                </View>
              }
            />

            <Cell
              title="昵称"
              extra={
                <View className="mine-profile-cell__extra">
                  <Input
                    className="mine-profile-cell__input"
                    type="nickname"
                    value={nicknameDraft}
                    placeholder="请输入昵称"
                    disabled={updating}
                    onInput={(e) => setNicknameDraft(e.detail.value)}
                    onBlur={handleNicknameBlur}
                  />
                  {cellArrow}
                </View>
              }
            />

            <Cell
              title="性别"
              extra={
                <View className="mine-profile-cell__extra">
                  <Text className="mine-profile-cell__value">
                    {getGenderLabel(profile.gender)}
                  </Text>
                  {cellArrow}
                </View>
              }
              onClick={openGenderSheet}
            />

            <Cell
              title="身高"
              extra={
                <View className="mine-profile-cell__extra">
                  <Text className="mine-profile-cell__value">
                    {`${profile.heightCm} cm`}
                  </Text>
                  {cellArrow}
                </View>
              }
              onClick={() => openMetricDialog("height")}
            />

            <Cell
              title="体重"
              extra={
                <View className="mine-profile-cell__extra">
                  <Text className="mine-profile-cell__value">
                    {`${profile.weightKg} kg`}
                  </Text>
                  {cellArrow}
                </View>
              }
              onClick={() => openMetricDialog("weight")}
            />

            <Cell
              title="职业"
              extra={
                <View className="mine-profile-cell__extra">
                  <NutInput
                    className="mine-profile-cell__input"
                    value={occupationDraft}
                    placeholder="请输入职业"
                    disabled={updating}
                    onChange={setOccupationDraft}
                    onBlur={handleOccupationBlur}
                  />
                  {cellArrow}
                </View>
              }
            />

            <Cell
              title="手机号"
              extra={
                <View className="mine-profile-cell__extra">
                  <Button
                    className="mine-profile-cell__phone-btn"
                    openType="getPhoneNumber"
                    disabled={updating}
                    onGetPhoneNumber={handleGetPhoneNumber}
                  >
                    {phoneLabel}
                  </Button>
                  {cellArrow}
                </View>
              }
            />
          </Cell.Group>
        )}
      </ScrollView>

      <ActionSheet
        visible={genderSheetVisible}
        options={genderActionOptions}
        cancelText="取消"
        onSelect={handleGenderSelect}
        onCancel={() => setGenderSheetVisible(false)}
        onClose={() => setGenderSheetVisible(false)}
      />

      <MineMetricDialog
        visible={metricDialogVisible}
        metric={metricDialog}
        initialValue={metricInitialValue}
        saving={updating}
        onClose={handleMetricClose}
        onConfirm={handleMetricConfirm}
      />
    </View>
  );
}

export default MineProfilePage;
