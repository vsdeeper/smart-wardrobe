function buildTryonPrompt({
  heightCm,
  weightKg,
  outfitName,
  description,
  imageCount = 1,
}) {
  const count = Math.max(1, imageCount)
  const refHint =
    count === 1
      ? '参考附带的图1衣物图片，'
      : `参考附带的图1至图${count}多件衣物图片，`

  return `${refHint}为身高 ${heightCm} cm、体重 ${weightKg} kg 的用户生成一张全身虚拟试穿效果图。
搭配名称：${outfitName}
搭配说明：${description}

要求：人物体型符合上述身高体重；自然站立姿势，清晰展示所有衣物搭配；背景简洁，时尚杂志风格。`
}

module.exports = {
  buildTryonPrompt,
}
