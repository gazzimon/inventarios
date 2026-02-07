import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#111827', '#2563eb', '#10b981', '#f97316', '#8b5cf6', '#f43f5e']

export default function SectorDonut({ sectors, onSelect, activeCode }) {
  if (!sectors || sectors.length === 0) return null

  const data = sectors.map((sector, index) => ({
    name: sector.name,
    value: sector.total,
    share: sector.share,
    ipcc: sector.ipcc_code,
    color: COLORS[index % COLORS.length]
  }))

  return (
    <div className="chart-card">
      <h3>Emisiones por sector IPCC</h3>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={110}
              onClick={(entry) => onSelect?.(entry?.payload?.ipcc || entry?.ipcc)}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.ipcc}
                  fill={entry.color}
                  fillOpacity={activeCode && activeCode !== entry.ipcc ? 0.5 : 1}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => [
                `${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })} tCO₂e`,
                `${name} (${(props.payload.share * 100).toFixed(1)}%)`
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <p className="chart-hint">Haz click en un sector para ver el detalle.</p>
      </div>
    </div>
  )
}
