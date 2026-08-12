import Taro from "@tarojs/taro";

const COLLECTION = "user_feedback";

export interface SubmitFeedbackInput {
  /** 反馈正文 */
  content: string;
}

/**
 * 提交用户反馈至云数据库。
 * 集合需在云开发控制台创建 `user_feedback`，并允许登录用户 create。
 */
export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<void> {
  const content = input.content.trim();
  if (!content) {
    throw new Error("请填写反馈内容");
  }

  const db = Taro.cloud.database();
  await db.collection(COLLECTION).add({
    data: {
      content,
      createdAt: db.serverDate(),
    },
  });
}
