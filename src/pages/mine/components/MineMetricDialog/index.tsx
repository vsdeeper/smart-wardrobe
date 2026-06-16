import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Dialog, Input } from "@nutui/nutui-react-taro";
import {
  PROFILE_HEIGHT_CM,
  PROFILE_WEIGHT_KG,
  type ProfileMetric,
} from "@/data/profile";

export type { ProfileMetric };

export interface MineMetricDialogProps {
  visible: boolean;
  metric: ProfileMetric | null;
  initialValue: number;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (value: number) => void;
}

const METRIC_CONFIG: Record<
  ProfileMetric,
  { title: string; placeholder: string; invalidToast: string }
> = {
  height: {
    title: "修改身高",
    placeholder: "请输入身高（cm）",
    invalidToast: "请输入有效身高",
  },
  weight: {
    title: "修改体重",
    placeholder: "请输入体重（kg）",
    invalidToast: "请输入有效体重",
  },
};

function parseMetricValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
  return value;
}

function isValidMetric(metric: ProfileMetric, value: number): boolean {
  if (metric === "height") {
    return value >= PROFILE_HEIGHT_CM.min && value <= PROFILE_HEIGHT_CM.max;
  }
  return value >= PROFILE_WEIGHT_KG.min && value <= PROFILE_WEIGHT_KG.max;
}

function MineMetricDialog({
  visible,
  metric,
  initialValue,
  saving = false,
  onClose,
  onConfirm,
}: MineMetricDialogProps) {
  const [inputValue, setInputValue] = useState(String(initialValue));

  useEffect(() => {
    if (visible && metric) {
      setInputValue(String(initialValue));
    }
  }, [visible, metric, initialValue]);

  if (!metric) return null;

  const config = METRIC_CONFIG[metric];

  const handleConfirm = () => {
    if (saving) return;

    const value = parseMetricValue(inputValue);
    if (value === null || !isValidMetric(metric, value)) {
      Taro.showToast({ title: config.invalidToast, icon: "none" });
      return;
    }

    onConfirm(value);
  };

  return (
    <Dialog
      title={config.title}
      visible={visible}
      footer={null}
      closeOnOverlayClick={!saving}
      onClose={onClose}
    >
      <View className="sw-dialog-body">
        <View className="sw-field-input sw-dialog-body__input">
          <Input
            value={inputValue}
            type="digit"
            placeholder={config.placeholder}
            onChange={setInputValue}
            onConfirm={handleConfirm}
          />
        </View>
        <View className="sw-dialog-footer">
          <View
            className="sw-dialog-footer__btn sw-dialog-footer__btn--cancel"
            onClick={(e) => {
              e.stopPropagation();
              if (!saving) onClose();
            }}
          >
            <Text className="sw-dialog-footer__text">取消</Text>
          </View>
          <View
            className="sw-dialog-footer__btn sw-dialog-footer__btn--confirm"
            onClick={(e) => {
              e.stopPropagation();
              handleConfirm();
            }}
          >
            <Text className="sw-dialog-footer__text sw-dialog-footer__text--confirm">
              {saving ? "保存中…" : "确定"}
            </Text>
          </View>
        </View>
      </View>
    </Dialog>
  );
}

export default MineMetricDialog;
