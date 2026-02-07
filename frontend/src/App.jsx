import { useMemo, useState } from 'react'
import './App.css'
import InventorySummary from './components/InventorySummary.jsx'
import SectorDonut from './components/SectorDonut.jsx'
import SectorTable from './components/SectorTable.jsx'
import SubsectorDonut from './components/SubsectorDonut.jsx'
import TerritorySelector from './components/TerritorySelector.jsx'

function App() {
  const [level, setLevel] = useState('province')
  const [adminName, setAdminName] = useState('Misiones')
  const [adminId, setAdminId] = useState(null)
  const [year, setYear] = useState(2022)
  const [inventoryMode, setInventoryMode] = useState('ipcc')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSector, setActiveSector] = useState(null)

  const activeSectorData = useMemo(() => {
    if (!inventory?.sectors?.length || !activeSector) return null
    return inventory.sectors.find((sector) => sector.ipcc_code === activeSector) || null
  }, [inventory, activeSector])

  const fetchInventory = async () => {
    if (!adminName) return
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        level,
        name: adminName,
        year: String(year),
        inventory_mode: inventoryMode
      })
      if (adminId) params.set('admin_id', adminId)

      const response = await fetch(`/api/ipcc/inventory?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Error al consultar inventario')
      }
      setInventory(data)
      setActiveSector(null)
    } catch (err) {
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">ClimateTrace Argentina</p>
          <h1>Dashboard IPCC de inventarios subnacionales</h1>
          <p className="subtitle">
            Visualiza inventarios por provincia o municipio/departamento con totales oficiales
            IPCC y modo ampliado para análisis completo.
          </p>
        </div>
        <div className="hero-card">
          <p className="hero-label">Consulta rápida</p>
          <div className="quick-actions">
            <button
              type="button"
              onClick={() => {
                setLevel('province')
                setAdminName('Misiones')
                setAdminId(null)
                setInventoryMode('ipcc')
                setYear(2022)
              }}
            >
              Misiones · IPCC 2022
            </button>
            <button
              type="button"
              onClick={() => {
                setLevel('department')
                setAdminName('Capital')
                setAdminId(null)
                setInventoryMode('extended')
                setYear(2022)
              }}
            >
              Capital · Ampliado 2022
            </button>
          </div>
        </div>
      </header>

      <TerritorySelector
        level={level}
        setLevel={setLevel}
        adminName={adminName}
        setAdminName={setAdminName}
        adminId={adminId}
        setAdminId={setAdminId}
        year={year}
        setYear={setYear}
        inventoryMode={inventoryMode}
        setInventoryMode={setInventoryMode}
        onSubmit={fetchInventory}
      />

      {loading && <div className="alert info">Cargando inventario…</div>}
      {error && <div className="alert error">{error}</div>}

      {inventory && (
        <>
          <InventorySummary inventory={inventory} />

          <div className="grid">
            <SectorDonut
              sectors={inventory.sectors}
              onSelect={setActiveSector}
              activeCode={activeSector}
            />
            <SectorTable
              sectors={inventory.sectors}
              onSelect={setActiveSector}
              activeCode={activeSector}
            />
          </div>

          {activeSectorData && (
            <div className="grid">
              <SubsectorDonut sector={activeSectorData} />
              <div className="table-card">
                <h3>Subsectores IPCC</h3>
                <div className="table">
                  <div className="table-row table-head">
                    <span>Código</span>
                    <span>Nombre</span>
                    <span>Emisiones</span>
                    <span>Share</span>
                  </div>
                  {activeSectorData.subsectors?.map((sub) => (
                    <div className="table-row" key={sub.ipcc_code}>
                      <span>{sub.ipcc_code}</span>
                      <span>
                        {sub.name}{' '}
                        {sub.ipcc_flags?.is_international_bunker && (
                          <small className="flag">Bunker</small>
                        )}
                      </span>
                      <span>{sub.total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                      <span>{(sub.share * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
