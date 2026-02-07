export default function SectorTable({ sectors, onSelect, activeCode }) {
  if (!sectors || sectors.length === 0) return null

  return (
    <div className="table-card">
      <h3>Totales por sector</h3>
      <div className="table">
        <div className="table-row table-head">
          <span>Sector</span>
          <span>Código IPCC</span>
          <span>Emisiones (tCO₂e)</span>
          <span>Porcentaje</span>
        </div>
        {sectors.map((sector) => (
          <button
            key={sector.ipcc_code}
            className={`table-row selectable ${activeCode === sector.ipcc_code ? 'active' : ''}`}
            type="button"
            onClick={() => onSelect?.(sector.ipcc_code)}
          >
            <span>{sector.name}</span>
            <span>{sector.ipcc_code}</span>
            <span>{sector.total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
            <span>{(sector.share * 100).toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}
