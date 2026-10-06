# Uniform Today Font Color & Balanced Calendar Grid Alignment

This revised plan makes the calendar date grid in `src/components/HomeView.tsx` visually balanced, tightly aligned, and uniform in color:

---

## 1. Uniform Black Font Color for Today's Date
- Keep Today's date numeral in the exact same black/neutral color (`text-[#181E24]` in light mode, `text-stone-100` in dark mode) as the rest of the current-month dates — removing the red/terracotta text color and any colored text shadow so only the box border identifies Today.

## 2. Tighter, Properly Aligned Date Cells & Box Border
- **Fixed, Balanced Cell Proportions**:
  - Replace the tall, loose button container (`min-h-[48px] sm:min-h-[58px] justify-start`) with a compact, centered cell layout (`h-[44px] sm:h-[48px] w-full max-w-[44px] sm:max-w-[48px] mx-auto flex flex-col items-center justify-center rounded-xl`) so every date sits in an identically proportioned square box directly beneath its weekday header (`M T W T F S S`).
  - Because each cell is a centered, compact square (`44px–48px`), the `ring-1.5 / border-2 border-[#C44D34]` box around Today frames the date number and post dots snugly instead of stretching across a huge empty rectangle.
- **Locked Numeral Baseline & Reserved Dots Row**:
  - Give every date number a fixed-height centered row (`h-5 flex items-center justify-center leading-none`) and give the category dots row below it a fixed reserved height (`h-2.5 flex items-center justify-center gap-1 mt-0.5`).
  - Because both the number slot and the dot slot have fixed heights on every cell (whether a day has 0 posts or 3 posts), all 7 columns of numbers stay on an exact horizontal line across every row, and scaling up the selected date number (`text-[15px] sm:text-[16px] font-black`) never shifts the alignment of neighboring dates or dots.
