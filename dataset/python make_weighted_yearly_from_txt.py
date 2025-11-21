import re
import math
import pandas as pd
from pathlib import Path

# ===== 파일 경로 설정 =====
here = Path(__file__).parent
input_file = here / "mod_ozone_1970_2023.txt"          # NASA에서 받은 txt
output_file = here / "ozone_yearly_means_global.csv"   # D3가 읽는 CSV (덮어씀)

# 월 이름 -> 숫자
MONTH_MAP = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
    "May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
    "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

records = []

with open(input_file, "r") as f:
    current_year = None
    current_month = None

    for raw in f:
        line = raw.strip()
        if not line:
            continue

        # --- 1) "Jan 1970" 이런 줄 찾기 (새로운 달 시작) ---
        m = re.match(r"([A-Za-z]{3})\s+(\d{4})", line)
        if m:
            mon_str, year_str = m.groups()
            if mon_str in MONTH_MAP:
                current_month = MONTH_MAP[mon_str]
                current_year = int(year_str)
            continue

        # 아직 연/월을 모르면 스킵
        if current_year is None or current_month is None:
            continue

        # --- 2) 헤더 줄/설명 줄은 스킵 ---
        if line.startswith("Lat Bin") or "Layers" in line:
            continue

        # --- 3) 위도 bin 데이터 줄 처리 ---
        parts = line.split()
        # 기대 형식: lat1 lat2 ... Total  (총 12개 값 이상)
        if len(parts) < 12:
            continue

        try:
            lat1 = float(parts[0])
            lat2 = float(parts[1])
            total = float(parts[-1])   # 마지막 값이 Total Ozone
        except ValueError:
            continue

        # 0.0인 행(미측정) 제외
        if total <= 0:
            continue

        # 위도 중심에서 cos(lat)를 가중치로 사용 (deg -> rad 변환)
        mid_lat = 0.5 * (lat1 + lat2)
        weight = math.cos(math.radians(mid_lat))

        records.append({
            "year": current_year,
            "month": current_month,
            "lat1": lat1,
            "lat2": lat2,
            "total": total,
            "weight": weight,
        })

# ===== 판다스로 집계 =====
df = pd.DataFrame(records)

# 각 (year, month)마다: sum(total * weight) / sum(weight)
df["tw"] = df["total"] * df["weight"]
monthly = (
    df.groupby(["year", "month"], as_index=False)
      .agg(sum_tw=("tw", "sum"), sum_w=("weight", "sum"))
)
monthly["avg_total"] = monthly["sum_tw"] / monthly["sum_w"]

# 연평균 (12개월 평균)
yearly = (
    monthly.groupby("year", as_index=False)["avg_total"]
           .mean()
           .rename(columns={"avg_total": "v"})
)

# D3가 기대하는 컬럼 이름: Year, v
yearly.rename(columns={"year": "Year"}, inplace=True)

yearly.to_csv(output_file, index=False)
print("Saved area-weighted yearly means to:", output_file)
print(yearly.head())