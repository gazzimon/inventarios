import { useEffect, useMemo, useState } from 'react'
import './App.css'

function App() {
  const [mode, setMode] = useState('province')
  const [name, setName] = useState('Misiones')
  const [years, setYears] = useState('2022')
  const [gas, setGas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    setName(mode === 'province' ? 'Misiones' : 'Posadas')
  }, [mode])

  const endpoint = useMemo(() => {
    return mode === 'province' ? '/api/ar/province-inventory' : '/api/ar/city-inventory'
  }, [mode])

  const formatNumber = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const params = new URLSearchParams()
      if (name) params.set('name', name)
      if (years) params.set('years', years)
      if (gas) params.set('gas', gas)

      const response = await fetch(`${endpoint}?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Error al consultar la API')
      }

      setResult(data)
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
          <h1>Inventarios de emisiones por provincia y ciudad</h1>
          <p className="subtitle">
            Consulta emisiones agregadas usando la API v6. Selecciona provincia o ciudad,
            define los años y recibe el resumen inmediato.
          </p>
        </div>
        <div className="hero-card">
          <p className="hero-label">Ejemplos rápidos</p>
          <div className="quick-actions">
            <button type="button" onClick={() => { setMode('province'); setName('Misiones') }}>
              Provincia: Misiones
            </button>
            <button type="button" onClick={() => { setMode('city'); setName('Posadas') }}>
              Ciudad: Posadas
            </button>
          </div>
          <p className="hero-note">Se usa `years=2022` por defecto si no indicas otro año.</p>
        </div>
      </header>

      <section className="panel">
        <form className="form" onSubmit={handleSubmit}>
          <div className="segmented">
            <button
              type="button"
              className={mode === 'province' ? 'active' : ''}
              onClick={() => setMode('province')}
            >
              Provincia
            </button>
            <button
              type="button"
              className={mode === 'city' ? 'active' : ''}
              onClick={() => setMode('city')}
            >
              Ciudad
            </button>
          </div>

          <label className="field">
            <span>Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={mode === 'province' ? 'Misiones' : 'Posadas'}
              required
            />
          </label>

          <label className="field">
            <span>Años</span>
            <input
              type="text"
              value={years}
              onChange={(event) => setYears(event.target.value)}
              placeholder="2022 o 2020,2021,2022"
            />
          </label>

          <label className="field">
            <span>Gas (opcional)</span>
            <input
              type="text"
              value={gas}
              onChange={(event) => setGas(event.target.value)}
              placeholder="co2e_100yr, co2e_20yr, co2, ch4, n2o"
            />
          </label>

          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Consultando…' : 'Consultar inventario'}
            </button>
            <span className="endpoint">Endpoint: {endpoint}</span>
          </div>
        </form>
      </section>

      <section className="results">
        {error && <div className="alert error">{error}</div>}

        {result && (
          <div className="result-card">
            <div className="result-header">
              <div>
                <p className="result-title">{result.name}</p>
                <p className="result-meta">
                  Nivel {result.level} · Admin ID {result.adminId} · Años {result.years}
                  {result.gas ? ` · Gas ${result.gas}` : ''}
                </p>
              </div>
              <div className="badge">Argentina</div>
            </div>

            <div className="table">
              <div className="table-row table-head">
                <span>País</span>
                <span>Gas</span>
                <span>Activos</span>
                <span>Emisiones</span>
              </div>
              {((result.data && (result.data.all || result.data.All)) || []).map((item, index) => (
                <div className="table-row" key={`${item?.Country || 'NA'}-${index}`}>
                  <span>{item?.Country || '—'}</span>
                  <span>{item?.Gas || '—'}</span>
                  <span>{formatNumber(item?.AssetCount)}</span>
                  <span>{formatNumber(item?.Emissions)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
