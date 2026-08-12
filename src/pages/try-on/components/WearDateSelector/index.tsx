import { Picker, Text, View } from "@tarojs/components";
import {
  formatWearDateChipLabel,
  getDateKey,
  getMaxWearDateKey,
  getMinCustomWearDateKey,
  getTomorrowDateKey,
  isCustomWearDateKey,
  isTodayDateKey,
  isTomorrowDateKey,
} from "@/utils/wear-date";

import "./index.scss";

export interface WearDateSelectorProps {
  value: string;
  onChange: (dateKey: string) => void;
  disabled?: boolean;
}

function WearDateSelector({ value, onChange, disabled }: WearDateSelectorProps) {
  const today = getDateKey();
  const tomorrow = getTomorrowDateKey(today);
  const customSelected = isCustomWearDateKey(value, today);
  const pickerValue = customSelected ? value : getMinCustomWearDateKey(today);

  return (
    <View className="wear-date-selector">
      <View
        className={[
          "wear-date-selector__chip",
          isTodayDateKey(value, today) && "wear-date-selector__chip--active",
          disabled && "wear-date-selector__chip--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={disabled ? undefined : () => onChange(today)}
      >
        <Text className="wear-date-selector__chip-text">今天</Text>
      </View>
      <View
        className={[
          "wear-date-selector__chip",
          isTomorrowDateKey(value, today) && "wear-date-selector__chip--active",
          disabled && "wear-date-selector__chip--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={disabled ? undefined : () => onChange(tomorrow)}
      >
        <Text className="wear-date-selector__chip-text">明天</Text>
      </View>
      <Picker
        mode="date"
        value={pickerValue}
        start={getMinCustomWearDateKey(today)}
        end={getMaxWearDateKey(today)}
        disabled={disabled}
        onChange={(event) => {
          const next = event.detail.value;
          if (next) onChange(next);
        }}
      >
        <View
          className={[
            "wear-date-selector__chip",
            customSelected && "wear-date-selector__chip--active",
            disabled && "wear-date-selector__chip--disabled",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Text className="wear-date-selector__chip-text">
            {customSelected
              ? `${formatWearDateChipLabel(value, today)} ▾`
              : "选日期 ▾"}
          </Text>
        </View>
      </Picker>
    </View>
  );
}

export default WearDateSelector;
