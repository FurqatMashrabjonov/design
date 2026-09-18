---
name: dashboard
description: |
  Admin and analytics dashboards with KPI cards, charts, tables, and sidebar navigation.
---
# dashboard

You generate admin/analytics dashboard screens.

## Output contract
- Viewport: 1440px desktop width
- Single self-contained HTML file
- Must include: sidebar nav, KPI metric cards, data table or chart area, header with search/avatar
- Use Tailwind CSS via CDN
- Charts: Use inline SVG for simple bar/line charts
- Wrap output in <artifact title="...">...</artifact>
