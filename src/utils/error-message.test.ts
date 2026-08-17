import { describe, expect, it } from "vitest";
import { toUserMessage } from "./error-message";

const FALLBACK = "操作失败，请稍后重试";

describe("toUserMessage", () => {
  it("非 Error / 空值回退 fallback", () => {
    expect(toUserMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(toUserMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(toUserMessage("字符串错误", FALLBACK)).toBe(FALLBACK);
    expect(toUserMessage(new Error(""), FALLBACK)).toBe(FALLBACK);
    expect(toUserMessage(new Error("   "), FALLBACK)).toBe(FALLBACK);
  });

  it("普通对象依次取 errMsg / message", () => {
    expect(
      toUserMessage({ errCode: -1, errMsg: "request:fail timeout" }, FALLBACK)
    ).toBe("请求超时，请稍后重试");
    expect(toUserMessage({ errMsg: "云端维护中" }, FALLBACK)).toBe(
      "云端维护中"
    );
    expect(toUserMessage({ message: "服务器开小差了" }, FALLBACK)).toBe(
      "服务器开小差了"
    );
    expect(toUserMessage({ errMsg: 12345 }, FALLBACK)).toBe(FALLBACK);
  });

  it("中文消息原样保留", () => {
    expect(toUserMessage(new Error("积分不足，请前往充值"), FALLBACK)).toBe(
      "积分不足，请前往充值"
    );
    expect(toUserMessage(new Error("这件衣物已经不在衣橱里了"), FALLBACK)).toBe(
      "这件衣物已经不在衣橱里了"
    );
  });

  it("代码级错误堆栈（英文为主 + 中文尾巴）回退 fallback，不泄漏英文", () => {
    const errMsg =
      "Error: cloud.callFunction:fail Error: errCode: -504002 functions execute fail | " +
      "errMsg: Error: Cannot find module '../providers/ark/images' Require stack: " +
      "/var/user/utils/model-env.js 更多错误信息请访问：https://docs.cloudbase.net/error-code/basic/FUNCTIONS_EXECUTE_FAIL";
    expect(toUserMessage({ errCode: -1, errMsg }, FALLBACK)).toBe(FALLBACK);
  });

  it("常见英文错误映射为中文", () => {
    expect(toUserMessage(new Error("Request timeout"), FALLBACK)).toBe(
      "请求超时，请稍后重试"
    );
    expect(
      toUserMessage(new Error("HTTP 504: Gateway Timeout"), FALLBACK)
    ).toBe("请求超时，请稍后重试");
    expect(toUserMessage(new Error("Rate limit reached"), FALLBACK)).toBe(
      "操作太频繁，请稍后重试"
    );
    expect(
      toUserMessage(new Error("You exceeded your current quota"), FALLBACK)
    ).toBe("服务额度不足，请稍后重试");
    expect(toUserMessage(new Error("Insufficient Balance"), FALLBACK)).toBe(
      "服务额度不足，请稍后重试"
    );
    expect(toUserMessage(new Error("Invalid Authentication"), FALLBACK)).toBe(
      "服务配置异常，请稍后重试"
    );
  });

  it("未知英文回退 fallback", () => {
    expect(toUserMessage(new Error("SomeUnknownInternalError"), FALLBACK)).toBe(
      FALLBACK
    );
    expect(toUserMessage(new Error("HTTP 502: Bad Gateway"), FALLBACK)).toBe(
      FALLBACK
    );
  });
});
