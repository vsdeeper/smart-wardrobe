// 说明：chat / images 适配器按需惰性加载（在调用函数内 require）。
// 各云函数按自身所需只同步对应 provider（chat-only 函数不打包 images.js，反之亦然），
// 若在模块顶层急切 require 两者，缺失任一适配器的函数会在部署时即崩（Cannot find module）。
const { requireEnv, getEnv } = require("./env");

/** 当前 MODEL_PROVIDER，缺省 ark；非 ark 抛错（百炼尚未接入） */
function getModelProvider() {
  const raw = getEnv("MODEL_PROVIDER");
  const provider = raw ? String(raw).toLowerCase() : "ark";
  if (provider !== "ark") {
    throw new Error(`百炼尚未接入（MODEL_PROVIDER=${provider}）`);
  }
  return provider;
}

function getModelApiKey() {
  getModelProvider();
  const apiKey = getEnv("MODEL_API_KEY");
  if (!apiKey) {
    throw new Error("未配置 MODEL_API_KEY");
  }
  return apiKey;
}

function requireModelBaseUrl() {
  getModelProvider();
  return requireEnv("MODEL_API_BASE_URL");
}

function getChatModel() {
  getModelProvider();
  const model = getEnv("CHAT_MODEL");
  if (!model) {
    throw new Error("未配置 CHAT_MODEL");
  }
  return model;
}

function getImageModel() {
  getModelProvider();
  const model = getEnv("IMAGE_MODEL");
  if (!model) {
    throw new Error("未配置 IMAGE_MODEL");
  }
  return model;
}

function getModelCredentials() {
  return {
    apiKey: getModelApiKey(),
    baseUrl: requireModelBaseUrl(),
  };
}

/**
 * chat/completions：读环境变量并委托当前供应商 chat 适配。
 */
async function chatCompletions(options) {
  const chat = require("../../providers/ark/chat");
  const creds = getModelCredentials();
  return chat.chatCompletions({
    ...creds,
    model: options.model || getChatModel(),
    ...options,
  });
}

/**
 * images/generations：读环境变量并委托当前供应商 images 适配。
 */
async function generateImages(options) {
  const images = require("../../providers/ark/images");
  const creds = getModelCredentials();
  return images.generateImages({
    ...creds,
    model: options.model || getImageModel(),
    ...options,
  });
}

async function generateImage(options) {
  const images = require("../../providers/ark/images");
  const creds = getModelCredentials();
  return images.generateImage({
    ...creds,
    model: options.model || getImageModel(),
    ...options,
  });
}

module.exports = {
  getModelProvider,
  getModelApiKey,
  requireModelBaseUrl,
  getChatModel,
  getImageModel,
  chatCompletions,
  generateImages,
  generateImage,
};
