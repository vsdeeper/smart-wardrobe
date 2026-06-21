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

export interface PrivacySettingResult {
  needAuthorization: boolean;
  privacyContractName?: string;
}

/** 查询用户是否需要授权隐私协议（weapp） */
export function checkNeedPrivacyAuthorization(): Promise<PrivacySettingResult> {
  if (process.env.TARO_ENV !== "weapp") {
    return Promise.resolve({ needAuthorization: false });
  }

  const wxApi = getWx();
  if (!wxApi?.getPrivacySetting) {
    return Promise.resolve({ needAuthorization: false });
  }

  return new Promise((resolve) => {
    wxApi.getPrivacySetting({
      success: (res) => {
        resolve({
          needAuthorization: Boolean(res.needAuthorization),
          privacyContractName: res.privacyContractName,
        });
      },
      fail: () => resolve({ needAuthorization: false }),
    });
  });
}

/** 打开微信用户隐私保护指引 */
export function openPrivacyContract(): void {
  getWx()?.openPrivacyContract?.({});
}
