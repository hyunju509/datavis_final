import pandas as pd

# 1. 월별 평균 CSV 불러오기 (지금 네가 만든 파일)
monthly_file = "ozone_monthly_avg.csv"

# 2. 연도 평균 CSV 저장 위치 (Final Project/data 폴더 안)
output_file = "../dataset/ozone_yearly_means_global.csv"

# 월별 데이터 읽기
df = pd.read_csv(monthly_file)

# 혹시 이상한 값 있으면 확인용 (원하면 주석 처리 가능)
print(df.head())

# year, month, avg_total 컬럼이 있다고 가정
# 연도별 평균 계산
yearly = (
    df.groupby("year")["avg_total"]
      .mean()
      .reset_index()
)

# D3 코드에서 기대하는 컬럼 이름으로 맞추기 → Year, v
yearly.rename(columns={"year": "Year", "avg_total": "v"}, inplace=True)

# data 폴더 안으로 저장
yearly.to_csv(output_file, index=False)

print("Saved:", output_file)
print(yearly.head())