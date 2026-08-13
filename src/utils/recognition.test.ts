import { describe, expect, it } from "vitest";
import {
  RECOGNITION_FAIL_MESSAGE,
  normalizeRecognitionErrorMessage,
} from "./recognition";

describe("normalizeRecognitionErrorMessage", () => {
  it("空值统一为识别失败", () => {
    expect(normalizeRecognitionErrorMessage()).toBe(RECOGNITION_FAIL_MESSAGE);
    expect(normalizeRecognitionErrorMessage("   ")).toBe(
      RECOGNITION_FAIL_MESSAGE,
    );
  });

  it("超时相关文案统一为稍后再试", () => {
    expect(normalizeRecognitionErrorMessage("识别超时")).toBe(
      "识别时间有点长，请稍后再试",
    );
    expect(normalizeRecognitionErrorMessage("Request timeout")).toBe(
      "识别时间有点长，请稍后再试",
    );
    expect(normalizeRecognitionErrorMessage("err -504003")).toBe(
      "识别时间有点长，请稍后再试",
    );
    expect(normalizeRecognitionErrorMessage("FUNCTIONSTIMELIMIT")).toBe(
      "识别时间有点长，请稍后再试",
    );
  });

  it("旧失败文案归一为识别失败", () => {
    expect(normalizeRecognitionErrorMessage("这次没识别出来，请换张图试试")).toBe(
      RECOGNITION_FAIL_MESSAGE,
    );
    expect(normalizeRecognitionErrorMessage(RECOGNITION_FAIL_MESSAGE)).toBe(
      RECOGNITION_FAIL_MESSAGE,
    );
  });

  it("其他错误透传", () => {
    expect(normalizeRecognitionErrorMessage("云端维护中")).toBe("云端维护中");
  });
});
