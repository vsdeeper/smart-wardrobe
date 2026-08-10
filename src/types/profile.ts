export type Gender = "male" | "female";

/** 用户画像（云数据库 user_profiles，每用户一条） */
export interface UserProfile {
  _id?: string;
  heightCm?: number;
  weightKg?: number;
  occupation: string;
  styleTags: string[];
  avatarFileId?: string;
  nickname?: string;
  gender?: Gender;
  updatedAt?: number;
}

export type ProfileMetric = "height" | "weight";

export type ProfileEditableField =
  | "gender"
  | "height"
  | "weight"
  | "occupation";
