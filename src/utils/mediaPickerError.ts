type WechatFail = { errMsg?: string; errno?: number; message?: string };

function getWx(): WechatMiniprogram.Wx | undefined {
  if (typeof wx !== "undefined") return wx;
  return (globalThis as { wx?: WechatMiniprogram.Wx }).wx;
}

function extractErrMsg(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "errMsg" in err) {
    return String((err as WechatFail).errMsg);
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as WechatFail).message;
    if (typeof message === "string" && message) return message;
  }
  return undefined;
}

/** 将 chooseMedia 等选图失败转为用户可读提示；用户主动取消时不提示 */
export function getMediaPickerErrorToast(err: unknown): string | null {
  const errMsg = extractErrMsg(err);
  if (!errMsg) return "无法选择图片，请稍后重试";

  const lower = errMsg.toLowerCase();
  if (lower.includes("cancel")) return null;
  if (lower.includes("deny") || lower.includes("auth deny")) return null;

  if (
    lower.includes("not declared in the privacy agreement") ||
    lower.includes("scope is not declared") ||
    errMsg.includes("112")
  ) {
    return "小程序未配置相册隐私声明，请在公众平台完善隐私保护指引";
  }

  if (
    lower.includes("privacy permission is not authorized") ||
    errMsg.includes("104")
  ) {
    return "需要同意隐私协议后才能选择图片";
  }

  if (lower.includes("privacy")) {
    return "请先同意隐私协议后再选择图片";
  }

  const stripped = errMsg.replace(/^chooseMedia:fail\s*/i, "").trim();
  return stripped || "无法选择图片，请稍后重试";
}

/** 选图前触发微信隐私授权（weapp）；不支持时直接 resolve */
export function ensurePrivacyAuthorize(): Promise<void> {
  if (process.env.TARO_ENV !== "weapp") {
    return Promise.resolve();
  }

  const wxApi = getWx();
  if (!wxApi?.requirePrivacyAuthorize) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    wxApi.requirePrivacyAuthorize({
      success: () => resolve(),
      fail: (err) => reject(err),
    });
  });
}

/** App 级隐私授权回调，配合官方隐私弹窗 */
export function initPrivacyAuthorization(): void {
  if (process.env.TARO_ENV !== "weapp") return;

  const wxApi = getWx();
  if (!wxApi?.onNeedPrivacyAuthorization) return;

  wxApi.onNeedPrivacyAuthorization((resolve) => {
    if (wxApi.openPrivacyContract) {
      wxApi.openPrivacyContract({
        success: () => {
          resolve({ event: "agree", buttonId: "privacy-agree-btn" });
        },
        fail: () => {
          resolve({ event: "disagree", buttonId: "privacy-disagree-btn" });
        },
      });
      return;
    }

    wxApi.showModal({
      title: "用户隐私保护提示",
      content: "使用相册或拍照功能需阅读并同意《用户隐私保护指引》",
      confirmText: "同意",
      cancelText: "拒绝",
      success: (res) => {
        if (res.confirm) {
          resolve({ event: "agree", buttonId: "privacy-agree-btn" });
        } else {
          resolve({ event: "disagree", buttonId: "privacy-disagree-btn" });
        }
      },
      fail: () => {
        resolve({ event: "disagree", buttonId: "privacy-disagree-btn" });
      },
    });
  });
}
