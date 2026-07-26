import { View, Text, Button, Input } from "@tarojs/components";
import { ArrowRight } from "@nutui/icons-react-taro";
import { Cell } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import DefaultAvatar from "@/components/DefaultAvatar";
import PageLoading from "@/components/PageLoading";
import {
  formatHeightLabel,
  formatWeightLabel,
  getGenderLabel,
  maskPhoneNumber,
} from "@/data/profile";
import { useMineProfileEdit } from "@/hooks/useMineProfileEdit";
import Main from "@/layouts/Main";
import "./index.scss";

function MineProfilePage() {
  const {
    profile,
    avatarUrl,
    loading,
    updating,
    openFieldEdit,
    handleChooseAvatar,
    nicknameDraft,
    handleNicknameInput,
    handleNicknameBlur,
    handleGetPhoneNumber,
    onAvatarLoadError,
  } = useMineProfileEdit();

  const cellArrow = <ArrowRight color="var(--nutui-gray-5)" size={14} />;

  const phoneLabel = profile.phoneNumber
    ? maskPhoneNumber(profile.phoneNumber)
    : "点击授权";

  const occupationLabel = profile.occupation?.trim() || "未设置";

  return (
    <Main
      showTabbar={false}
      header={<AppNavbar showBack title="个人资料" />}
    >
      <Main.Scroll>
        <View className="mine-profile-page">
          {loading ? (
            <PageLoading />
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
                      {formatHeightLabel(profile.heightCm)}
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
                      {formatWeightLabel(profile.weightKg)}
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
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default MineProfilePage;
