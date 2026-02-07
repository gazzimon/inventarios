export default function InventorySummary({ inventory }) {
  if (!inventory) return null

  const total = inventory.total || 0
  const mode = inventory.metadata?.inventory_mode || 'ipcc'
  const title =
    mode === 'extended'
      ? 'Inventario ampliado (incluye todas las emisiones)'
      : 'Inventario IPCC (excluye aviación y navegación internacional)'

  return (
    <section className="summary-card">
      <div>
        <p className="summary-label">Total emisiones</p>
        <h2>{total.toLocaleString('es-AR', { maximumFractionDigits: 2 })} tCO₂e</h2>
        <p className="summary-note">{title}</p>
        {inventory.admin?.full_name && (
          <p className="summary-meta-line">{inventory.admin.full_name}</p>
        )}
      </div>
      <div className="summary-meta">
        <span>Año {inventory.year}</span>
        <span>Modo {mode.toUpperCase()}</span>
        <span>ID {inventory.admin?.id}</span>
      </div>
    </section>
  )
}
