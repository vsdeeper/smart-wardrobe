import { useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { ArrowRight, Edit, Photograph } from "@nutui/icons-react-taro";
import { Image } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import { MOCK_AVATAR_SRC } from "@/data/mock/constants";
import {
  PROFILE_DIARY_ENTRIES,
  PROFILE_STATS,
  PROFILE_STYLE_TAGS,
} from "@/data/mock/profile";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import Main from "@/layouts/Main";
import "./index.scss";

const ICON_PRIMARY = "var(--nutui-brand-6)";

type DiaryLayout = "grid" | "list";

function ProfilePage() {
  const { activeTab, onTabChange } = useMainTabNavigation(3);
  const [diaryLayout, setDiaryLayout] = useState<DiaryLayout>("grid");

  const handleEditAvatar = () => {
    Taro.showToast({ title: "编辑头像", icon: "none" });
  };

  const handleRetest = () => {
    Taro.showToast({ title: "风格测试即将上线", icon: "none" });
  };

  const handleAddDiary = () => {
    Taro.showToast({ title: "添加记录", icon: "none" });
  };

  const handleToggleDiaryLayout = () => {
    setDiaryLayout((prev) => (prev === "grid" ? "list" : "grid"));
  };

  const diaryToggleIcon =
    diaryLayout === "grid" ? "icon-list" : "icon-category";

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--profile"
      header={<AppNavbar />}
    >
      <Main.Scroll>
        <View className="profile">
          <View className="profile-header">
            <View className="profile-avatar">
              <View className="profile-avatar__ring">
                <Image
                  className="profile-avatar__image"
                  src={MOCK_AVATAR_SRC}
                  mode="aspectFill"
                  radius="50%"
                />
              </View>
              <View className="profile-avatar__edit" onClick={handleEditAvatar}>
                <Edit color="var(--sw-color-on-primary)" size={18} />
              </View>
            </View>
            <Text className="profile-header__name">Elena Sterling</Text>
            <Text className="profile-header__bio">
              专注于可持续亚麻材质与建筑感廓形，致力于打造有意识的简约衣橱。
            </Text>
          </View>

          <View className="profile-stats">
            {PROFILE_STATS.map((stat) => (
              <View key={stat.key} className="profile-stat card">
                <Text
                  className={`iconfont ${stat.iconClass} profile-stat__icon`}
                />
                <Text className="profile-stat__label">{stat.label}</Text>
                <Text className="profile-stat__value">{stat.value}</Text>
              </View>
            ))}
          </View>

          <View className="profile-section">
            <View className="profile-section__head">
              <Text className="profile-section__title">风格标签</Text>
              <View className="profile-section__action" onClick={handleRetest}>
                <Text className="profile-section__action-text">重新测试</Text>
                <ArrowRight color={ICON_PRIMARY} size={14} />
              </View>
            </View>
            <View className="profile-tags">
              {PROFILE_STYLE_TAGS.map((tag) => (
                <View key={tag} className="profile-tag">
                  <Text className="profile-tag__text">{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="profile-section profile-section--diary">
            <View className="profile-section__head">
              <Text className="profile-section__title">视觉日记</Text>
              <View
                className="profile-diary-toggle"
                onClick={handleToggleDiaryLayout}
              >
                <Text
                  className={`iconfont ${diaryToggleIcon} profile-diary-toggle__icon`}
                />
              </View>
            </View>
            {diaryLayout === "grid" ? (
              <View className="profile-diary">
                {PROFILE_DIARY_ENTRIES.map((entry) => (
                  <View key={entry.id} className="profile-diary__item">
                    <Image
                      className="profile-diary__image"
                      src={entry.image}
                      mode="aspectFill"
                      radius="0"
                    />
                  </View>
                ))}
                <View className="profile-diary__add" onClick={handleAddDiary}>
                  <Photograph color="var(--nutui-gray-5)" size={32} />
                  <Text className="profile-diary__add-text">添加记录</Text>
                </View>
              </View>
            ) : (
              <View className="profile-diary profile-diary--list">
                {PROFILE_DIARY_ENTRIES.map((entry) => (
                  <View key={entry.id} className="profile-diary-row card">
                    <View className="profile-diary-row__media">
                      <Image
                        className="profile-diary-row__image"
                        src={entry.image}
                        mode="aspectFill"
                        radius="0"
                      />
                    </View>
                    <View className="profile-diary-row__body">
                      <Text className="profile-diary-row__title">
                        {entry.title}
                      </Text>
                      <Text className="profile-diary-row__desc">
                        {entry.description}
                      </Text>
                    </View>
                  </View>
                ))}
                <View
                  className="profile-diary-row profile-diary-row--add"
                  onClick={handleAddDiary}
                >
                  <Photograph color="var(--nutui-gray-5)" size={32} />
                  <Text className="profile-diary-row__add-text">添加记录</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default ProfilePage;
