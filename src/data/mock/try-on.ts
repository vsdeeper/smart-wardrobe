export interface TryOnOutfitPiece {
  id: number;
  category: string;
  name: string;
  image: string;
}

export const TRY_ON_OUTFIT_PIECES: TryOnOutfitPiece[] = [
  {
    id: 1,
    category: "外套",
    name: "柔软亚麻西装",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBw3Rt1LTR0iAus-pSvKJmmYMaa3JYqAWnhZniCfKtRIdTxgC7juZkWot5ARP89TL4Ky6WU_G7L6wzAriFkwHEeb5wlQFJkZFryzSnF1-yFBAi3kREEqsiwhMfzne18MOXf3mqn6ZiOR3C4yCRWcpJVfltGUjTFWPSLAI9q_ER4P3ajRk3ImutzpNM5YS27qD9MSUpBX61-KL6hA3ZOJ-NnrTRYvJpsjSZKEtpyvms_PN2tTLGfmmlry8dOOIkfjkYTP1IFdRlTvOf4",
  },
  {
    id: 2,
    category: "下装",
    name: "阔腿斜纹裤",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD1fNe-82aDDhEx7bXwRQP-5plPuDic6nDBcHJebtYQE_L5JZRD8qlbQInmYMrSQ4-yPcT1TJOUgZ96WNmW3GUxncjssg8B7vrSH3TA_Okj2WdGtLDnlSpF8PZU4iMxMI5WQRSDfoyAI-ohMI1_AazahB0yHCOF2gGh7j-g45S07C_D2NcyFFij-LFl8HBAPz3TxycIbQ8IuQ44XIz6sLxujFHCbW_WigkUQmjJ3dicABQx-R7Dwcv3WIwNHnsQsqMetxZW1-jd4Hus",
  },
];

export const TRY_ON_OUTFIT_TIPS = [
  { id: 1, icon: "☀️", label: "高紫外线" },
  { id: 2, icon: "🌬️", label: "微风夜晚" },
];
