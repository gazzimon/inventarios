import { useMemo, useState } from 'react'
import './App.css'
import InventorySummary from './components/InventorySummary.jsx'
import SectorDonut from './components/SectorDonut.jsx'
import SectorTable from './components/SectorTable.jsx'
import SubsectorDonut from './components/SubsectorDonut.jsx'
import TerritorySelector from './components/TerritorySelector.jsx'

const i18n = {
  es: {
    appEyebrow: 'ClimateTrace Argentina',
    appTitle: 'Dashboard IPCC de inventarios subnacionales',
    appSubtitle:
      'Visualiza inventarios por provincia o municipio/departamento con totales oficiales IPCC y modo ampliado para an?lisis completo.',
    langEs: 'ES',
    langEn: 'EN',
    queryLabel: 'Consulta',
    loadingInventory: 'Cargando inventario...',
    errorGeneric: 'Error inesperado',
    stockChangeInfo: 'Cambio de stock de carbono (reportado por separado):',
    subsectorTitle: 'Subsectores IPCC',
    tableCode: 'C?digo',
    tableName: 'Nombre',
    tableEmissions: 'Emisiones',
    tableShare: 'Share',
    bunkerBadge: 'Bunker',
    stockBadge: 'Cambio de stock',
    unit_tco2e: 'tCO2e',
    summaryTotal: 'Total emisiones',
    summaryModeIpcc: 'Inventario IPCC (excluye aviaci?n y navegaci?n internacional)',
    summaryModeExtended: 'Inventario ampliado (incluye todas las emisiones)',
    summaryYear: 'A?o',
    summaryMode: 'Modo',
    summaryId: 'ID',
    sectorDonutTitle: 'Emisiones por sector IPCC',
    sectorDonutHint: 'Haz clic en un sector para ver el detalle.',
    sectorTableTitle: 'Totales por sector',
    sectorTableSector: 'Sector',
    sectorTableCode: 'C?digo IPCC',
    sectorTableEmissions: 'Emisiones (tCO2e)',
    sectorTablePercent: 'Porcentaje',
    detailPrefix: 'Detalle:',
    tooltipShare: 'Participaci?n',
    provinceLabel: 'Provincia',
    provincePlaceholder: 'Seleccionar provincia',
    departmentLabel: 'Departamento (opcional)',
    departmentPlaceholder: 'Total provincial',
    yearLabel: 'A?o',
    inventoryModeLabel: 'Modo de inventario',
    inventoryIpcc: 'Inventario IPCC',
    inventoryExtended: 'Inventario ampliado',
    submit: 'Consultar inventario',
    loading: 'Cargando...'
  },
  en: {
    appEyebrow: 'ClimateTrace Argentina',
    appTitle: 'IPCC Subnational Inventories Dashboard',
    appSubtitle:
      'Explore inventories by province or municipality/department with official IPCC totals and extended mode for full analysis.',
    langEs: 'ES',
    langEn: 'EN',
    queryLabel: 'Query',
    loadingInventory: 'Loading inventory...',
    errorGeneric: 'Unexpected error',
    stockChangeInfo: 'Land-use carbon stock change (reported separately):',
    subsectorTitle: 'IPCC Subsectors',
    tableCode: 'Code',
    tableName: 'Name',
    tableEmissions: 'Emissions',
    tableShare: 'Share',
    bunkerBadge: 'Bunker',
    stockBadge: 'Stock change',
    unit_tco2e: 'tCO2e',
    summaryTotal: 'Total emissions',
    summaryModeIpcc: 'IPCC inventory (excludes international aviation and shipping)',
    summaryModeExtended: 'Extended inventory (includes all emissions)',
    summaryYear: 'Year',
    summaryMode: 'Mode',
    summaryId: 'ID',
    sectorDonutTitle: 'Emissions by IPCC sector',
    sectorDonutHint: 'Click a sector to see details.',
    sectorTableTitle: 'Totals by sector',
    sectorTableSector: 'Sector',
    sectorTableCode: 'IPCC code',
    sectorTableEmissions: 'Emissions (tCO2e)',
    sectorTablePercent: 'Share',
    detailPrefix: 'Detail:',
    tooltipShare: 'Share',
    provinceLabel: 'Province',
    provincePlaceholder: 'Select province',
    departmentLabel: 'Department (optional)',
    departmentPlaceholder: 'Provincial total',
    yearLabel: 'Year',
    inventoryModeLabel: 'Inventory mode',
    inventoryIpcc: 'IPCC inventory',
    inventoryExtended: 'Extended inventory',
    submit: 'Fetch inventory',
    loading: 'Loading...'
  }
}

const SUBSECTOR_LABELS = {
  'Fires and Land Use Change': {
    es: 'Incendios y cambio de uso del suelo',
    en: 'Fires and Land Use Change'
  },
  'Forest Land Fires': {
    es: 'Incendios en tierras forestales',
    en: 'Forest Land Fires'
  },
  Cropland: {
    es: 'Cultivos',
    en: 'Cropland'
  },
  Livestock: {
    es: 'Ganader?a',
    en: 'Livestock'
  },
  'Enteric Fermentation': {
    es: 'Fermentaci?n ent?rica',
    en: 'Enteric Fermentation'
  },
  'Other AFOLU': {
    es: 'Otros AFOLU',
    en: 'Other AFOLU'
  },
  'Domestic Aviation': {
    es: 'Aviaci?n dom?stica',
    en: 'Domestic Aviation'
  },
  'Domestic Navigation': {
    es: 'Navegaci?n dom?stica',
    en: 'Domestic Navigation'
  },
  'Road Transportation': {
    es: 'Transporte por carretera',
    en: 'Road Transportation'
  },
  'Stationary Energy': {
    es: 'Energ?a estacionaria',
    en: 'Stationary Energy'
  },
  'Electricity Generation': {
    es: 'Generaci?n el?ctrica',
    en: 'Electricity Generation'
  },
  'Fugitive Emissions': {
    es: 'Emisiones fugitivas',
    en: 'Fugitive Emissions'
  },
  'Mineral Industry': {
    es: 'Industria mineral',
    en: 'Mineral Industry'
  },
  'Chemical Industry': {
    es: 'Industria qu?mica',
    en: 'Chemical Industry'
  },
  'Metal Industry': {
    es: 'Industria metal?rgica',
    en: 'Metal Industry'
  },
  'Other Manufacturing': {
    es: 'Otras manufacturas',
    en: 'Other Manufacturing'
  },
  'Solid Waste': {
    es: 'Residuos s?lidos',
    en: 'Solid Waste'
  },
  Wastewater: {
    es: 'Aguas residuales',
    en: 'Wastewater'
  }
}

function App() {
  const [provinceId, setProvinceId] = useState(null)
  const [provinceName, setProvinceName] = useState('')
  const [departmentId, setDepartmentId] = useState(null)
  const [departmentName, setDepartmentName] = useState('')
  const [year, setYear] = useState(2022)
  const [inventoryMode, setInventoryMode] = useState('ipcc')
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSector, setActiveSector] = useState(null)
  const [lastQuery, setLastQuery] = useState('')
  const [lang, setLang] = useState('es')

  const t = (key) => i18n[lang]?.[key] || key
  const locale = lang === 'es' ? 'es-AR' : 'en-US'
  const translateSubsector = (name) => {
    const entry = SUBSECTOR_LABELS[name]
    return entry ? entry[lang] || name : name
  }

  const activeSectorData = useMemo(() => {
    if (!inventory?.sectors?.length || !activeSector) return null
    return inventory.sectors.find((sector) => sector.ipcc_code === activeSector) || null
  }, [inventory, activeSector])

  const fetchInventory = async () => {
    if (!provinceName) return
    setLoading(true)
    setError('')

    try {
      const isDepartment = Boolean(departmentId)
      const params = new URLSearchParams({
        level: isDepartment ? 'department' : 'province',
        year: String(year),
        inventory_mode: inventoryMode
      })

      if (isDepartment) {
        params.set('admin_id', departmentId)
      } else if (provinceId) {
        params.set('admin_id', provinceId)
      } else {
        params.set('name', isDepartment ? departmentName : provinceName)
      }

      const queryString = `/api/ipcc/inventory?${params.toString()}`
      setLastQuery(queryString)

      const response = await fetch(queryString)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || t('errorGeneric'))
      }
      setInventory(data)
      setActiveSector(null)
    } catch (err) {
      setError(err.message || t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">{t('appEyebrow')}</p>
          <h1>{t('appTitle')}</h1>
          <p className="subtitle">{t('appSubtitle')}</p>
          <div className="segmented" style={{ marginTop: '14px' }}>
            <button
              type="button"
              className={lang === 'es' ? 'active' : ''}
              onClick={() => setLang('es')}
            >
              {t('langEs')}
            </button>
            <button
              type="button"
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
            >
              {t('langEn')}
            </button>
          </div>
        </div>
      </header>

      <TerritorySelector
        provinceId={provinceId}
        setProvinceId={setProvinceId}
        provinceName={provinceName}
        setProvinceName={setProvinceName}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        departmentName={departmentName}
        setDepartmentName={setDepartmentName}
        year={year}
        setYear={setYear}
        inventoryMode={inventoryMode}
        setInventoryMode={setInventoryMode}
        onSubmit={fetchInventory}
        t={t}
      />

      {lastQuery && (
        <div className="alert info">
          {t('queryLabel')}: {lastQuery}
        </div>
      )}

      {loading && <div className="alert info">{t('loadingInventory')}</div>}
      {error && <div className="alert error">{error}</div>}

      {inventory && (
        <>
          <InventorySummary inventory={inventory} t={t} locale={locale} />

          <div className="grid">
            <SectorDonut
              sectors={inventory.sectors}
              onSelect={setActiveSector}
              activeCode={activeSector}
              t={t}
              locale={locale}
            />
            <SectorTable
              sectors={inventory.sectors}
              onSelect={setActiveSector}
              activeCode={activeSector}
              t={t}
              locale={locale}
            />
          </div>

          {activeSectorData && (
            <>
              <div className="grid">
                <SubsectorDonut sector={activeSectorData} t={t} locale={locale} translateSubsector={translateSubsector} />
                <div className="table-card">
                  <h3>{t('subsectorTitle')}</h3>
                  <div className="table">
                    <div className="table-row table-head">
                      <span>{t('tableCode')}</span>
                      <span>{t('tableName')}</span>
                      <span>{t('tableEmissions')}</span>
                      <span>{t('tableShare')}</span>
                    </div>
                    {(() => {
                      const subsectors = activeSectorData.subsectors || []
                      const operationalTotal = subsectors
                        .filter((sub) => !sub.ipcc_flags?.is_stock_change)
                        .reduce((sum, sub) => sum + (sub.total || 0), 0)

                      return subsectors.map((sub) => {
                        const isStockChange = Boolean(sub.ipcc_flags?.is_stock_change)
                        const share = operationalTotal > 0 ? (sub.total / operationalTotal) * 100 : 0
                        return (
                          <div className="table-row" key={sub.ipcc_code}>
                            <span>{sub.ipcc_code}</span>
                            <span>
                              {translateSubsector(sub.name)}{' '}
                              {sub.ipcc_flags?.is_international_bunker && (
                                <small className="flag">{t('bunkerBadge')}</small>
                              )}
                              {isStockChange && <small className="flag">{t('stockBadge')}</small>}
                            </span>
                            <span>{sub.total.toLocaleString(locale, { maximumFractionDigits: 2 })}</span>
                            <span>{isStockChange ? '-' : `${share.toFixed(1)}%`}</span>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
              {activeSectorData.ipcc_code === '3' && inventory.total_stock_change !== undefined && (
                <div className="alert info">
                  {t('stockChangeInfo')}{' '}
                  {Number(inventory.total_stock_change).toLocaleString(locale, {
                    maximumFractionDigits: 2
                  })}{' '}
                  {t('unit_tco2e')}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App
