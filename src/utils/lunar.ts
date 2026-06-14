// 农历生日 → 公历日期对照表
// 数据来源: 香港天文台万年历

interface Birthday {
  lunarMonth: number;
  lunarDay: number;
  /** 每年对应的公历日期 (月, 日) */
  solarDates: Record<number, [number, number]>;
}

// 你的生日: 农历九月十八 — 数据来源: 香港天文台万年历
const MY_BIRTHDAY: Birthday = {
  lunarMonth: 9,
  lunarDay: 18,
  solarDates: {
    2025: [11, 7],
    2026: [10, 27],
    2027: [10, 16],
    2028: [11, 3],
    2029: [10, 23],
    2030: [11, 11],
  },
};

// 她的生日: 农历正月初五 — 数据来源: 香港天文台万年历
const HER_BIRTHDAY: Birthday = {
  lunarMonth: 1,
  lunarDay: 5,
  solarDates: {
    2025: [2, 2],
    2026: [2, 21],
    2027: [2, 9],
    2028: [2, 28],
    2029: [2, 16],
    2030: [2, 5],
  },
};

/** 获取今年该农历生日对应的公历日期 */
export function getLunarBirthdayThisYear(birthday: Birthday): Date {
  const today = new Date();
  const year = today.getFullYear();
  const entry = birthday.solarDates[year];
  if (entry) {
    return new Date(year, entry[0] - 1, entry[1]);
  }
  // 没有数据的年份，用最近一年的日期 +/- 365 天估算
  const years = Object.keys(birthday.solarDates).map(Number).sort();
  const nearest = years.reduce((a, b) => Math.abs(b - year) < Math.abs(a - year) ? b : a);
  const [m, d] = birthday.solarDates[nearest];
  const daysDiff = (year - nearest) * 365;
  const base = new Date(nearest, m - 1, d);
  return new Date(base.getTime() + daysDiff * 86400000);
}

export { MY_BIRTHDAY, HER_BIRTHDAY };
