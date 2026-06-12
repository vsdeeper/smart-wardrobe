function buildTryonSystemPrompt() {
  return `你是虚拟试衣图像生成助手。根据用户体型信息与多件衣物图片，生成一张全身穿搭效果图。

要求：
1. 人物体型符合用户身高体重描述
2. 自然站立姿势，清晰展示所有衣物搭配
3. 背景简洁，时尚杂志风格
4. 若无法生成图片，在回复中说明原因`
}

function buildTryonUserPrompt({ heightCm, weightKg, outfitName, description }) {
  return `用户体型：身高 ${heightCm} cm，体重 ${weightKg} kg。
搭配名称：${outfitName}
搭配说明：${description}

请根据附带的衣物图片，生成符合该用户体型的全身穿搭效果图。`
}

function extractImageFromContent(content) {
  if (!content || typeof content !== 'string') return null

  const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp)/i)
  if (urlMatch) return { type: 'url', value: urlMatch[0] }

  const base64Match = content.match(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/i)
  if (base64Match) return { type: 'base64', value: base64Match[0] }

  return null
}

module.exports = {
  buildTryonSystemPrompt,
  buildTryonUserPrompt,
  extractImageFromContent,
}
