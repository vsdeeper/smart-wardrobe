import Taro from "@tarojs/taro";

interface PhoneCloudResult {
  phoneNumber?: string;
  error?: string;
}

export async function fetchPhoneNumberByCode(code: string): Promise<string> {
  const { result } = await Taro.cloud.callFunction({
    name: "get-phone-number",
    data: { code },
  });

  const data = result as PhoneCloudResult;
  if (data.error) {
    throw new Error(data.error);
  }
  if (!data.phoneNumber) {
    throw new Error("未获取到手机号");
  }

  return data.phoneNumber;
}
