import { ProfileEditableField } from "@/types/profile";
import Taro from "@tarojs/taro";


export function openProfileFieldEdit(field: ProfileEditableField): void {
  Taro.navigateTo({ url: `/pages/mine-profile-field/index?field=${field}` });
}
