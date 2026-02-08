export default function InventorySummary({ inventory, t, locale }) {
  if (!inventory) return null

  const total = inventory.total || 0
  const mode = inventory.metadata?.inventory_mode || 'ipcc'
  const title =
    mode === 'extended' ? t('summaryModeExtended') : t('summaryModeIpcc')

  return (
    <section className="summary-card">
      <div>
        <p className="summary-label">{t('summaryTotal')}</p>
        <h2>
          {total.toLocaleString(locale, { maximumFractionDigits: 2 })} {t('unit_tco2e')}
        </h2>
        <p className="summary-note">{title}</p>
        {inventory.admin?.full_name && (
          <p className="summary-meta-line">{inventory.admin.full_name}</p>
        )}
      </div>
      <div className="summary-meta">
        <span>
          {t('summaryYear')} {inventory.year}
        </span>
        <span>
          {t('summaryMode')} {mode.toUpperCase()}
        </span>
        <span>
          {t('summaryId')} {inventory.admin?.id}
        </span>
      </div>
    </section>
  )
}
