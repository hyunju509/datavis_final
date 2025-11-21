// Ozone time-map image scroller
// This script assumes the following elements exist in your HTML:
//
// - <input type="range" id="yearSlider" ...>
// - <span id="yearLabel"></span>
// - <img id="ozoneTimeImage" ...>
// - Optional: .step elements inside #ozone-map-section with data-year attributes
//
// Example image path pattern: ./ozone_images/ozone_1982.png

(function () {
  // 전체 슬라이더 범위 (내러티브용)
  const MIN_YEAR = 1979;
  const MAX_YEAR = 2024;

  // 실제 이미지가 존재하는 가장 이른 연도 (지금은 1982부터 있는 상황)
  // 나중에 1970~1981 이미지를 추가하면 이 숫자만 바꿔주면 됨
  const FIRST_IMAGE_YEAR = 1979;

  function clampYear(y) {
    y = +y;
    if (isNaN(y)) return MIN_YEAR;
    return Math.min(MAX_YEAR, Math.max(MIN_YEAR, y));
  }

  function initOzoneScroller() {
    const slider = document.getElementById("yearSlider");
    const label = document.getElementById("yearLabel");
    const img = document.getElementById("ozoneTimeImage");

    if (!slider || !label || !img) {
      // 필수 요소가 없으면 아무 것도 하지 않음
      return;
    }

    // HTML에 뭐가 적혀있든, 여기서 슬라이더 범위를 강제로 맞춰줌
    slider.min = MIN_YEAR;
    slider.max = MAX_YEAR;
    if (!slider.value) {
      slider.value = MIN_YEAR;
    }

    function updateYear(year) {
      const y = clampYear(year);
      label.textContent = y;

      // 실제 이미지가 존재하는 연도 이하로는 내려가지 않게 한 번 더 클램프
      const imgYear = Math.max(FIRST_IMAGE_YEAR, y);

      // index.html과 같은 폴더에 ozone_images 폴더가 있다고 가정
      img.src = "ozone_images/ozone_" + imgYear + ".png";
    }

    // 슬라이더 인터랙션
    slider.addEventListener("input", (e) => {
      updateYear(e.target.value);
    });

    // 오른쪽 step 카드에서 연도로 점프하는 기능 (옵션)
    const steps = document.querySelectorAll(
      "#ozone-map-section .step[data-year]"
    );

    steps.forEach((step) => {
      const year = step.getAttribute("data-year");

      function jump() {
        const clamped = clampYear(year);
        slider.value = clamped;
        updateYear(clamped);
      }

      step.addEventListener("mouseenter", jump);
      step.addEventListener("click", jump);
    });

    // 초기 상태
    updateYear(slider.value || MIN_YEAR);
  }

  // DOM 준비 후 실행
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOzoneScroller);
  } else {
    initOzoneScroller();
  }
})();