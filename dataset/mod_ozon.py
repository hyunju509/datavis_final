import re
import pandas as pd

input_file = "mod_ozone_1970_2023.txt"   # 네 txt 파일 이름
output_file = "ozone_monthly_avg.csv"    # 결과 csv 이름

rows = []
current_year = None
current_month = None

month_map = {
    "Jan":1, "Feb":2, "Mar":3, "Apr":4,
    "May":5, "Jun":6, "Jul":7, "Aug":8,
    "Sep":9, "Oct":10, "Nov":11, "Dec":12
}

with open(input_file, "r") as f:
    for line in f:
        line = line.strip()

        # "Jan 1970" 이런 줄 찾기
        m = re.match(r"([A-Za-z]{3})\s+(\d{4})", line)
        if m:
            current_month = month_map[m.group(1)]
            current_year = int(m.group(2))
            continue

        # 위도 구간 데이터 줄 (숫자로 시작하는 줄)
        if re.match(r"^-?\d", line):
            parts = line.split()
            if len(parts) < 12:
                continue

            lat_min = float(parts[0])
            lat_max = float(parts[1])
            total_ozone = float(parts[-1])

            rows.append({
                "year": current_year,
                "month": current_month,
                "lat_min": lat_min,
                "lat_max": lat_max,
                "total_ozone": total_ozone
            })

# DataFrame으로 만들기
df = pd.DataFrame(rows)

# 0 값(데이터 없음) 제거
df = df[df["total_ozone"] > 0]

# 연·월별 평균 계산
monthly = (
    df.groupby(["year", "month"])["total_ozone"]
      .mean()
      .reset_index()
)

# 원하는 컬럼 이름으로 변경
monthly.rename(columns={"total_ozone": "avg_total"}, inplace=True)

# year,month,avg_total 순서로 저장
monthly[["year", "month", "avg_total"]].to_csv(output_file, index=False)

print("Saved:", output_file)