import { useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { ArrowRight, Edit, Photograph } from "@nutui/icons-react-taro";
import { Image, Loading } from "@nutui/nutui-react-taro";
import DefaultAvatar from "@/components/DefaultAvatar";
import { WORK_SCENE_OPTIONS } from "@/data/profile";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useVisualDiary } from "@/hooks/useVisualDiary";
import Main from "@/layouts/Main";
import "./index.scss";

const ICON_PRIMARY = "var(--nutui-brand-6)";

type DiaryLayout = "grid" | "list";

function ProfilePage() {
  const { activeTab, onTabChange } = useMainTabNavigation(3);
  const [diaryLayout, setDiaryLayout] = useState<DiaryLayout>("grid");
  const { profile, itemCount, loading: profileLoading } = useUserProfile();
  const { entries, loading: diaryLoading } = useVisualDiary();

  const handleEditAvatar = () => {
    Taro.showToast({ title: "编辑头像", icon: "none" });
  };

  const handleRetest = () => {
    Taro.showToast({ title: "风格测试即将上线", icon: "none" });
  };

  const handleAddDiary = () => {
    Taro.showToast({ title: "请从试穿页记录穿搭", icon: "none" });
  };

  const handleToggleDiaryLayout = () => {
    setDiaryLayout((prev) => (prev === "grid" ? "list" : "grid"));
  };

  const diaryToggleIcon =
    diaryLayout === "grid" ? "icon-list" : "icon-category";

  const sceneLabel =
    WORK_SCENE_OPTIONS.find((o) => o.value === profile.workScenes[0])?.label ??
    "办公室";

  const stats = [
    { key: "height", label: "身高", value: `${profile.heightCm} cm`, iconClass: "icon-height" },
    { key: "weight", label: "体重", value: `${profile.weightKg} kg`, iconClass: "icon-weight" },
    { key: "items", label: "单品", value: String(itemCount), iconClass: "icon-wardrobe" },
    { key: "outfits", label: "搭配", value: String(entries.length), iconClass: "icon-like" },
  ];

  const styleTags =
    profile.styleTags.length > 0 ? profile.styleTags : ["极简主义", "天然材质"];

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--profile"
    >
      <Main.Scroll>
        <View className="profile">
          <View className="profile-header">
            <View className="profile-avatar">
              <View className="profile-avatar__ring">
                <DefaultAvatar size="lg" />
              </View>
              <View className="profile-avatar__edit" onClick={handleEditAvatar}>
                <Edit color="var(--sw-color-on-primary)" size={18} />
              </View>
            </View>
            <Text className="profile-header__name">
              {profile.occupation || "衣橱用户"}
            </Text>
            <Text className="profile-header__bio">
              {profile.occupation
                ? `${sceneLabel}场景 · ${profile.heightCm}cm / ${profile.weightKg}kg`
                : "完善个人画像，获得更精准的 AI 穿搭推荐。"}
            </Text>
          </View>

          <View className="profile-stats">
            {stats.map((stat) => (
              <View key={stat.key} className="profile-stat card">
                <Text
                  className={`iconfont ${stat.iconClass} profile-stat__icon`}
                />
                <Text className="profile-stat__label">{stat.label}</Text>
                <Text className="profile-stat__value">
                  {profileLoading && stat.key !== "items" ? "…" : stat.value}
                </Text>
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
              {styleTags.map((tag) => (
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
            {diaryLoading ? (
              <View className="profile-diary-loading">
                <Loading type="circular" />
              </View>
            ) : diaryLayout === "grid" ? (
              <View className="profile-diary">
                {entries.map((entry) => (
                  <View key={entry._id} className="profile-diary__item">
                    <Image
                      className="profile-diary__image"
                      src={entry.coverUrl ?? ""}
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
                {entries.map((entry) => (
                  <View key={entry._id} className="profile-diary-row card">
                    <View className="profile-diary-row__media">
                      <Image
                        className="profile-diary-row__image"
                        src={entry.coverUrl ?? ""}
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
