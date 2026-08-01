import { View, Text } from "@tarojs/components";
import { Cell, Input as NutInput } from "@nutui/nutui-react-taro";
import {
  GENDER_OPTIONS,
  type Gender,
  type ProfileEditableField,
} from "@/data/profile";
import "./index.scss";

interface FieldInputProps {
  field: ProfileEditableField;
  fieldMeta: { title: string; placeholder?: string; hint?: string };
  updating: boolean;
  textDraft: string;
  setTextDraft: (value: string) => void;
  genderDraft: Gender | null;
  setGenderDraft: (value: Gender) => void;
}

function FieldInput({
  field,
  fieldMeta,
  updating,
  textDraft,
  setTextDraft,
  genderDraft,
  setGenderDraft,
}: FieldInputProps) {
  if (field === "gender") {
    return (
      <Cell.Group className="mine-profile-field-page__group">
        {GENDER_OPTIONS.map((option) => {
          const selected = genderDraft === option.value;
          return (
            <Cell
              key={option.value}
              className={
                selected
                  ? "mine-profile-field-gender-cell mine-profile-field-gender-cell--selected"
                  : "mine-profile-field-gender-cell"
              }
              title={
                <Text className="mine-profile-field-gender-cell__label">
                  {option.label}
                </Text>
              }
              extra={
                selected ? (
                  <Text className="mine-profile-field-gender-cell__check">
                    ✓
                  </Text>
                ) : undefined
              }
              onClick={() => setGenderDraft(option.value)}
            />
          );
        })}
      </Cell.Group>
    );
  }

  if (field === "height" || field === "weight") {
    return (
      <View>
        <View className="sw-field-input">
          <NutInput
            value={textDraft}
            type="digit"
            placeholder={fieldMeta.placeholder}
            disabled={updating}
            onChange={setTextDraft}
          />
        </View>
        {fieldMeta.hint ? (
          <Text className="mine-profile-field-page__hint">
            {fieldMeta.hint}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="sw-field-input">
      <NutInput
        value={textDraft}
        placeholder={fieldMeta.placeholder}
        disabled={updating}
        onChange={setTextDraft}
      />
    </View>
  );
}

export default FieldInput;
