import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#0f172a', '#38bdf8', '#22c55e', '#facc15', '#fb7185', '#a78bfa']

export default function SubsectorDonut({ sector, t, locale }) {
  const subsectors = sector?.subsectors || []
  if (!sector || subsectors.length === 0) return null

  const isAfolu = sector.ipcc_code === '3'
  const operationalSubsectors = isAfolu
    ? subsectors.filter((sub) => !sub.ipcc_flags?.is_stock_change)
    : subsectors
  const operationalTotal = operationalSubsectors.reduce((sum, sub) => sum + (sub.total || 0), 0)

  const data = operationalSubsectors.map((sub, index) => ({
    name: sub.name,
    value: sub.total,
    share: operationalTotal > 0 ? sub.total / operationalTotal : 0,
    ipcc: sub.ipcc_code,
    bunker: sub.ipcc_flags?.is_international_bunker,
    color: COLORS[index % COLORS.length]
  }))

  return (
    <div className="chart-card">
      <h3>
        {t('detailPrefix')} {sector.name}
      </h3>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
              {data.map((entry) => (
                <Cell key={entry.ipcc} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => [
                `${Number(value).toLocaleString(locale, { maximumFractionDigits: 2 })} ${t('unit_tco2e')}`,
                `${name} ? ${t('tooltipShare')} ${(props.payload.share * 100).toFixed(1)}%`
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="subsector-list">
          {subsectors.map((sub) => {
            const isStockChange = Boolean(sub.ipcc_flags?.is_stock_change)
            const share = operationalTotal > 0 ? (sub.total / operationalTotal) * 100 : 0
            return (
              <div key={sub.ipcc_code} className="subsector-row">
                <div>
                  <p>{sub.name}</p>
                  <small>{sub.ipcc_code}</small>
                </div>
                <div className="subsector-meta">
                  {sub.ipcc_flags?.is_international_bunker && (
                    <span className="flag">{t('bunkerBadge')}</span>
                  )}
                  {isStockChange && <span className="flag">{t('stockBadge')}</span>}
                  <span>{isStockChange ? '-' : `${share.toFixed(1)}%`}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
