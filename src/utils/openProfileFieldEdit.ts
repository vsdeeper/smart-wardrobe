import Taro from "@tarojs/taro";
import type { ProfileEditableField } from "@/data/profile";

export function openProfileFieldEdit(field: ProfileEditableField): void {
  Taro.navigateTo({ url: `/pages/mine-profile-field/index?field=${field}` });
}
