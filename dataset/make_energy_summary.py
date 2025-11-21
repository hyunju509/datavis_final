import pandas as pd

# 파일 경로
file20 = "./dataset/energy_clean_20.csv"
file21 = "./dataset/energy_clean_21.csv"
file22_23 = "./dataset/energy_clean_22_23.csv"

# CSV 불러오기
df20 = pd.read_csv(file20, header=None, names=["Year", "Energy", "GHG", "Other"])
df21 = pd.read_csv(file21, header=None, names=["Year", "Energy", "GHG", "Other"])
df22_23 = pd.read_csv(file22_23, header=None, names=["Year", "Energy", "GHG", "Other"])

# 모두 하나로 합치기
df = pd.concat([df20, df21, df22_23], ignore_index=True)

# 문자열 NaN 처리
df = df.replace("Not Available", pd.NA)

# 숫자로 변환
df["Energy"] = pd.to_numeric(df["Energy"], errors="coerce")
df["GHG"] = pd.to_numeric(df["GHG"], errors="coerce")

# 연도별 합계(에너지/배출량) + 시설수
summary = df.groupby("Year").agg(
    Total_Energy=("Energy", "sum"),
    Total_GHG=("GHG", "sum"),
    Facility_Count=("Energy", "count")
).reset_index()

# CSV 저장
summary.to_csv("energy_nyc_summary.csv", index=False)

print("energy_nyc_summary.csv 생성 완료!")
print(summary)