export interface ProfileDiaryEntry {
  id: number;
  image: string;
  title: string;
  description: string;
}

export const PROFILE_DIARY_ENTRIES: ProfileDiaryEntry[] = [
  {
    id: 1,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC2_Wj7GNi5NOwQ36npvs_AHhkJe90zLeshwKJFqoxed1J0EQD5kAYmCirE5aAocbYpAm0654hjExh38N-gvBMcsUsKEoLcrl85qQ1wa9FK08l_plXoE0pwTrke-oTGydoP7SQRqu_bcCQ98JJ4QEJlQKfk6Rtc_3wJUpjVrRSNFnG0PuAsVdqyDibCU8upzPqgjyazjHG0lUdFD9GHUTZOm9rluxRSPy4irc6fcopnwyIP2lerb6Vd4RpMvkOkeX1qLHTU0wrL-PBV",
    title: "Summer Morning",
    description: "亚麻连体套装 + 草编平底鞋，轻盈透气，适合周末清晨出门。",
  },
  {
    id: 2,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC6liWPTcBsx9aAT1X8OHuVRjNTZXLixX8KIdADzdRaKmMkbqv4asHi0q_LBG6SYumpVCREErxcJG_a5yV7fUuqFOjWzI7cxZxsCriPAlbzxivFLDPsWKXltysmJcwWDGnJ0MOYJ-4yUQQq-6af73UepUR3HJpAz7PNTSYpTJF2I-ROqcVCheeQ9RkJzVKe1wi4CbfjMbbA22m9bGm1O9h_jYIU5cX8xAya1EfdCVc9uMBjrMUJ1X12xqhDpU8F5uIOiHMkR9v9lH0v",
    title: "Garden Walk",
    description: "针织开衫 + 牛仔半裙，大地色系叠穿，园中漫步舒适自在。",
  },
  {
    id: 3,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCsz7YlopvuEninw4zSOTgMhfQEOHOMRD-GYpFHAOexzIoXKnJtdkNWbOhD2N1j3P383kJibBx1z5w89JbDPB-Dqda9e2C_EZJwzKvz13w4rYfEGVbjrD1KFepVlaL4MUINE32A4xpnd7yl-K1ech98IauXGPmOCu8gZm8TXrNkZmhXrrytRvgJEMKueAiBVvaIe628Avea8vaCTo2aegx5Tf8nQwfRaOfv7H5ZzPknwFrUGMO2wbMC3iVf523VVmDdV5yrjshyc6r_",
    title: "City Layers",
    description: "结构感外套 + 直筒长裤，层次分明，城市通勤利落有型。",
  },
  {
    id: 4,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBZ9wm4dJF-WVRhS8brE5cpAq_SCm6uUPt7ehPc7jPRZnHsAZX2g_hUY685cKR6oTZakjo-DZouUgLnqRGMqiPaPhk5eoDlN1rix4_nnQ41dU0voAw9K2Qspw_c0sJyl0Kana_rmCXtSzVIv78eM7SvCEsrWL6aPKhl6_fW_nbLB1KLg1IwbiQMbNQ3UyAru42F3s51sJ970M_YwAZIb2DwOEoRtGSFjxwC0pmANFbSLn6i1Z5pdUqEid8-sk09Nfa01igWswoH4I7s",
    title: "Office Edit",
    description: "剪裁白衬衫 + 阔腿西裤，简约专业，办公室全日舒适。",
  },
  {
    id: 5,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBIeMfqXg0q71tOM9KTTn3OiLdOcFuSfZXyi0k6T-l-UH0r2ez97-xZp_rVdnHk1q03AWJvyK5Pan-3xJluzD7Y0YMd7czMD82uz48iEMUl8yFmQzo_O3kdEYj-cZl8_ZrYwyp-KgNRU0kzJzK_vtjFQrOOHXL1LNaF7CNvFDOBBjRBPi0EtF33cKc-EAUJDkXDPObNSc9T7whm3SJgxxvYczwMYbTLDZhzBYHfOVK1Crt0i_qDfw3-PX76aLBXXxdMVvsQTqIhX7G4",
    title: "Evening Softness",
    description: "丝质连衣裙 + 低跟穆勒鞋，暮色温柔，适合晚间小聚。",
  },
];

export const PROFILE_STATS = [
  { key: "height", label: "身高", value: "174 cm", iconClass: "icon-height" },
  { key: "weight", label: "体重", value: "62 kg", iconClass: "icon-weight" },
  { key: "items", label: "单品", value: "128", iconClass: "icon-wardrobe" },
  { key: "outfits", label: "搭配", value: "42", iconClass: "icon-like" },
] as const;
