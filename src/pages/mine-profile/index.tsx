import { View, Text, ScrollView, Button, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { ArrowRight } from "@nutui/icons-react-taro";
import { Cell, Loading, NavBar } from "@nutui/nutui-react-taro";
import DefaultAvatar from "@/components/DefaultAvatar";
import { getGenderLabel, maskPhoneNumber } from "@/data/profile";
import { useMineProfileEdit } from "@/hooks/useMineProfileEdit";
import "./index.scss";

function MineProfilePage() {
  const {
    profile,
    avatarUrl,
    loading,
    updating,
    handleBack,
    openFieldEdit,
    handleChooseAvatar,
    nicknameDraft,
    handleNicknameInput,
    handleNicknameBlur,
    handleGetPhoneNumber,
    onAvatarLoadError,
  } = useMineProfileEdit();

  const { statusBarHeight, safeArea } = Taro.getWindowInfo();
  const safeAreaBottom = safeArea
    ? Taro.getWindowInfo().screenHeight - safeArea.bottom
    : 0;

  const cellArrow = <ArrowRight color="var(--nutui-gray-5)" size={14} />;

  const phoneLabel = profile.phoneNumber
    ? maskPhoneNumber(profile.phoneNumber)
    : "点击授权";

  const occupationLabel = profile.occupation?.trim() || "未设置";

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
            <View className="mine-profile-cell-wrap mine-profile-cell-wrap--overlay">
              <Cell
                title="头像"
                extra={
                  <View className="mine-profile-cell__extra">
                    <DefaultAvatar
                      size="sm"
                      src={avatarUrl}
                      onLoadError={onAvatarLoadError}
                    />
                    {cellArrow}
                  </View>
                }
                align="center"
              />
              <Button
                className="mine-profile-cell__overlay-btn"
                openType="chooseAvatar"
                disabled={updating}
                onChooseAvatar={handleChooseAvatar}
              />
            </View>

            <Cell
              title="昵称"
              align="center"
              extra={
                <View className="mine-profile-cell__extra mine-profile-cell__extra--nickname">
                  <Input
                    className="mine-profile-cell__nickname-input"
                    type="nickname"
                    value={nicknameDraft}
                    placeholder="点击授权"
                    onInput={handleNicknameInput}
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
              align="center"
              onClick={() => openFieldEdit("gender")}
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
              align="center"
              onClick={() => openFieldEdit("height")}
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
              align="center"
              onClick={() => openFieldEdit("weight")}
            />

            <Cell
              title="职业"
              extra={
                <View className="mine-profile-cell__extra">
                  <Text className="mine-profile-cell__value">
                    {occupationLabel}
                  </Text>
                  {cellArrow}
                </View>
              }
              align="center"
              onClick={() => openFieldEdit("occupation")}
            />

            <View className="mine-profile-cell-wrap mine-profile-cell-wrap--overlay">
              <Cell
                title="手机号"
                extra={
                  <View className="mine-profile-cell__extra">
                    <Text className="mine-profile-cell__value">
                      {phoneLabel}
                    </Text>
                    {cellArrow}
                  </View>
                }
                align="center"
              />
              <Button
                className="mine-profile-cell__overlay-btn"
                openType="getPhoneNumber"
                disabled={updating}
                onGetPhoneNumber={handleGetPhoneNumber}
              />
            </View>
          </Cell.Group>
        )}
      </ScrollView>
    </View>
  );
}

export default MineProfilePage;
