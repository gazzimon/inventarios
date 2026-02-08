export default function SectorTable({ sectors, onSelect, activeCode, t, locale }) {
  if (!sectors || sectors.length === 0) return null

  return (
    <div className="table-card">
      <h3>{t('sectorTableTitle')}</h3>
      <div className="table">
        <div className="table-row table-head">
          <span>{t('sectorTableSector')}</span>
          <span>{t('sectorTableCode')}</span>
          <span>{t('sectorTableEmissions')}</span>
          <span>{t('sectorTablePercent')}</span>
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
            <span>{sector.total.toLocaleString(locale, { maximumFractionDigits: 2 })}</span>
            <span>{(sector.share * 100).toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}
