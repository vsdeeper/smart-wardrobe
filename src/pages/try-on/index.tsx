import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Edit, Location, LogisticsError } from "@nutui/icons-react-taro";
import { Image, Loading } from "@nutui/nutui-react-taro";
import AppNavbar from "@/components/AppNavbar";
import {
  TRY_ON_HERO_IMAGE,
  TRY_ON_OUTFIT_PIECES,
  TRY_ON_OUTFIT_TIPS,
} from "@/data/mock/try-on";
import { useWeather } from "@/hooks/useWeather";
import { useMainTabNavigation } from "@/hooks/useMainTabNavigation";
import Main from "@/layouts/Main";
import "./index.scss";

function TryOnPage() {
  const { activeTab, onTabChange } = useMainTabNavigation(1);
  const { viewModel, status, isStale, handleCardClick } = useWeather();

  const handleWearOutfit = () => {
    Taro.showToast({ title: "已记录今日穿搭", icon: "success" });
  };

  const handleEditOutfit = () => {
    Taro.showToast({ title: "修改搭配", icon: "none" });
  };

  return (
    <Main
      activeTab={activeTab}
      onTabChange={onTabChange}
      scrollClassName="main-scroll--try-on"
      header={<AppNavbar />}
    >
      <Main.Scroll>
        <View
          className={[
            "weather-card",
            status === "loading" && "weather-card--loading",
            status === "location_denied" && "weather-card--location-denied",
          ]
            .filter(Boolean)
            .join(" ")}
          hoverClass="weather-card--pressed"
          hoverStartTime={0}
          hoverStayTime={100}
          onClick={handleCardClick}
        >
          <View className="weather-card__main">
            {status === "loading" || status === "idle" ? (
              <>
                <View className="weather-card__skeleton weather-card__skeleton--icon">
                  <Loading type="circular" />
                </View>
                <View className="weather-card__info">
                  <Text className="weather-card__location">获取天气中…</Text>
                </View>
              </>
            ) : status === "location_denied" ? (
              <>
                <View className="weather-card__icon weather-card__icon--location">
                  <Location size={36} color="var(--nutui-secondary-1)" />
                </View>
                <View className="weather-card__info">
                  <Text className="weather-card__location">
                    无法获取您的位置，开启定位
                  </Text>
                </View>
              </>
            ) : status === "error" ? (
              <>
                <View className="weather-card__icon weather-card__icon--error">
                  <LogisticsError
                    size={36}
                    color="var(--nutui-color-warning)"
                  />
                </View>
                <View className="weather-card__info">
                  <Text className="weather-card__location">
                    获取失败，点击重试
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text
                  className={`iconfont ${viewModel?.icon} weather-card__icon weather-card__icon--glyph`}
                />
                <View className="weather-card__info">
                  <Text className="weather-card__location">
                    {viewModel?.locationLine}
                  </Text>
                  <Text className="weather-card__detail">
                    {viewModel?.detailLine}
                  </Text>
                  {isStale && (
                    <Text className="weather-card__hint">
                      数据可能已过期，点击刷新
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
          <Text className="weather-card__air">
            {status === "loading" || status === "idle"
              ? ""
              : status === "success" && viewModel
                ? viewModel.airQualityLabel
                : ""}
          </Text>
        </View>

        <View className="outfit-hero">
          <Image
            className="outfit-hero__image"
            src={TRY_ON_HERO_IMAGE}
            mode="aspectFill"
          />
          <View className="outfit-hero__gradient" aria-hidden />
          <View className="outfit-hero__badge">
            <Text className="outfit-hero__badge-icon">★</Text>
            <Text className="outfit-hero__badge-text">匹配度 98%</Text>
          </View>
          <View className="outfit-hero__content">
            <Text className="outfit-hero__title">优雅亚麻</Text>
            <Text className="outfit-hero__desc">
              非常适合您下午两点的画廊开幕式，以及随后的微风晚宴。
            </Text>
          </View>
        </View>

        <View className="outfit-list">
          <View className="outfit-list__header">
            <Text className="outfit-list__title">搭配清单</Text>
            <View className="outfit-list__edit" onClick={handleEditOutfit}>
              <Text className="outfit-list__edit-text">修改搭配</Text>
              <Edit size={14} color="var(--nutui-brand-6)" />
            </View>
          </View>
          <View className="outfit-list__grid">
            {TRY_ON_OUTFIT_PIECES.map((piece) => (
              <View
                key={piece.id}
                className="outfit-piece"
                hoverClass="outfit-piece--pressed"
                hoverStartTime={0}
                hoverStayTime={100}
              >
                <View className="outfit-piece__image-wrap">
                  <Image
                    className="outfit-piece__image"
                    src={piece.image}
                    mode="aspectFill"
                  />
                </View>
                <View className="outfit-piece__body">
                  <Text className="outfit-piece__category">
                    {piece.category}
                  </Text>
                  <Text className="outfit-piece__name">{piece.name}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="outfit-tips">
          <Text className="outfit-tips__title">搭配小贴士</Text>
          <View className="outfit-tips__tags">
            {TRY_ON_OUTFIT_TIPS.map((tip) => (
              <View key={tip.id} className="outfit-tips__tag">
                <Text className="outfit-tips__tag-icon">{tip.icon}</Text>
                <Text className="outfit-tips__tag-text">{tip.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="wear-btn-wrap">
          <View className="wear-btn" onClick={handleWearOutfit}>
            <Text className="wear-btn__text">就穿这一身</Text>
          </View>
        </View>
      </Main.Scroll>
    </Main>
  );
}

export default TryOnPage;
